import "server-only";
import { and, asc, count, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import {
  invitations,
  memberships,
  organizations,
  subscriptions,
  users,
  type Organization,
  type Role,
  type User,
} from "@/db/schema";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { planLimits } from "@/lib/billing/plans";
import { env } from "@/server-env";
import { can, canManageMember } from "./permissions";
import { slugify } from "./slug";

/*
 * Organizasyonlar (ekipler) ile ilgili iş kuralları.
 *
 * Çok kiracılık (multi-tenancy) kuralı: Bir organizasyonun verisine dokunan
 * her fonksiyon, işlemi yapan kişinin üyelik bilgisini (`Actor`) alır.
 * Actor her zaman sunucuda, oturumdaki kullanıcı ve URL'deki slug'dan
 * hesaplanır (getMembership); tarayıcıdan gelen bir organizasyon id'sine asla
 * güvenilmez. Böylece bir kullanıcı başka bir ekibin id'sini tahmin etse bile
 * onun verisine erişemez.
 */

export type Actor = { userId: string; organizationId: string; role: Role };

export type Result<E extends string> = { ok: true } | { ok: false; error: E };

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export async function createOrganization(
  userId: string,
  name: string,
): Promise<Organization> {
  const base = slugify(name);

  // Slug başkası tarafından alınmışsa sonuna kısa rastgele bir ek koyup
  // tekrar deneriz. Önce sorup sonra eklemek yerine veritabanının unique
  // kısıtına güveniyoruz (aynı anda iki istek gelse bile çakışma olmaz).
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug =
      attempt === 0
        ? base
        : `${base}-${generateToken().slice(0, 4).toLowerCase()}`;
    try {
      return await db.transaction(async (tx) => {
        const [org] = await tx
          .insert(organizations)
          .values({ name, slug })
          .returning();
        await tx
          .insert(memberships)
          .values({ userId, organizationId: org!.id, role: "owner" });
        // Her ekip ücretsiz planla başlar.
        await tx.insert(subscriptions).values({ organizationId: org!.id });
        return org!;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Benzersiz bir slug bulunamadı");
}

export function listUserOrganizations(userId: string) {
  return db
    .select({ organization: organizations, role: memberships.role })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(organizations.name));
}

/** Kullanıcı bu organizasyonun üyesi değilse null döner. */
export async function getMembership(userId: string, slug: string) {
  const [row] = await db
    .select({ organization: organizations, role: memberships.role })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(memberships.userId, userId), eq(organizations.slug, slug)));
  return row ?? null;
}

export function listMembers(organizationId: string) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, organizationId))
    .orderBy(asc(memberships.createdAt));
}

export async function getPlan(organizationId: string) {
  const [row] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId));
  return row ?? { plan: "free" as const, status: "active" as const };
}

export async function renameOrganization(
  actor: Actor,
  name: string,
): Promise<Result<"forbidden">> {
  if (!can(actor.role, "org:update")) return { ok: false, error: "forbidden" };
  await db
    .update(organizations)
    .set({ name })
    .where(eq(organizations.id, actor.organizationId));
  return { ok: true };
}

export async function deleteOrganization(
  actor: Actor,
): Promise<Result<"forbidden">> {
  if (!can(actor.role, "org:delete")) return { ok: false, error: "forbidden" };
  // Üyelikler, davetler ve abonelik "cascade" ile birlikte silinir.
  await db
    .delete(organizations)
    .where(eq(organizations.id, actor.organizationId));
  return { ok: true };
}

type MemberError = "forbidden" | "not_found" | "last_owner";

export async function changeRole(
  actor: Actor,
  targetUserId: string,
  newRole: Role,
): Promise<Result<MemberError>> {
  return db.transaction(async (tx) => {
    // FOR UPDATE: Bu ekibin üyelik satırlarını işlem bitene kadar kilitler.
    // İki owner aynı anda birbirinin rolünü düşürmeye çalışırsa, ikincisi
    // birincinin bitmesini bekler ve "son owner" kontrolü doğru çalışır.
    const rows = await tx
      .select({ userId: memberships.userId, role: memberships.role })
      .from(memberships)
      .where(eq(memberships.organizationId, actor.organizationId))
      .for("update");

    const target = rows.find((r) => r.userId === targetUserId);
    if (!target) return { ok: false, error: "not_found" };
    if (!canManageMember(actor.role, target.role, newRole)) {
      return { ok: false, error: "forbidden" };
    }

    const owners = rows.filter((r) => r.role === "owner").length;
    if (target.role === "owner" && newRole !== "owner" && owners === 1) {
      return { ok: false, error: "last_owner" };
    }

    await tx
      .update(memberships)
      .set({ role: newRole })
      .where(
        and(
          eq(memberships.organizationId, actor.organizationId),
          eq(memberships.userId, targetUserId),
        ),
      );
    return { ok: true };
  });
}

/** Üyeyi çıkarır. targetUserId işlemi yapanın kendisiyse "ekipten ayrıl"dır. */
export async function removeMember(
  actor: Actor,
  targetUserId: string,
): Promise<Result<MemberError>> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ userId: memberships.userId, role: memberships.role })
      .from(memberships)
      .where(eq(memberships.organizationId, actor.organizationId))
      .for("update");

    const target = rows.find((r) => r.userId === targetUserId);
    if (!target) return { ok: false, error: "not_found" };

    const leaving = targetUserId === actor.userId;
    if (!leaving && !canManageMember(actor.role, target.role)) {
      return { ok: false, error: "forbidden" };
    }

    const owners = rows.filter((r) => r.role === "owner").length;
    if (target.role === "owner" && owners === 1) {
      return { ok: false, error: "last_owner" };
    }

    await tx
      .delete(memberships)
      .where(
        and(
          eq(memberships.organizationId, actor.organizationId),
          eq(memberships.userId, targetUserId),
        ),
      );
    return { ok: true };
  });
}

/**
 * Ekipte kullanılan "koltuk" sayısı: üyeler + süresi dolmamış bekleyen
 * davetler. `exceptEmail` verilirse o adrese giden davet sayılmaz.
 */
export async function getSeatUsage(
  organizationId: string,
  exceptEmail?: string,
): Promise<number> {
  const [[members], [pending]] = await Promise.all([
    db
      .select({ n: count() })
      .from(memberships)
      .where(eq(memberships.organizationId, organizationId)),
    db
      .select({ n: count() })
      .from(invitations)
      .where(
        and(
          eq(invitations.organizationId, organizationId),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, new Date()),
          exceptEmail
            ? sql`lower(${invitations.email}) <> ${exceptEmail.toLowerCase()}`
            : undefined,
        ),
      ),
  ]);
  return (members?.n ?? 0) + (pending?.n ?? 0);
}

export async function createInvitation(
  actor: Actor,
  email: string,
  role: Role,
): Promise<
  | { ok: true; token: string }
  | { ok: false; error: "forbidden" | "already_member" | "plan_limit" }
> {
  if (
    !can(actor.role, "member:invite") ||
    !canManageMember(actor.role, "member", role)
  ) {
    return { ok: false, error: "forbidden" };
  }

  const [existing] = await db
    .select({ n: count() })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.organizationId, actor.organizationId),
        eq(sql`lower(${users.email})`, email.toLowerCase()),
      ),
    );
  if (existing && existing.n > 0) return { ok: false, error: "already_member" };

  // Plan sınırı: üyeler + bekleyen davetler, planın izin verdiğinden fazla
  // olamaz. (Aynı kişiye tekrar davet atılıyorsa eski davet silineceği için
  // onu saymıyoruz.)
  const [{ plan }, usage] = await Promise.all([
    getPlan(actor.organizationId),
    getSeatUsage(actor.organizationId, email),
  ]);
  if (usage >= planLimits[plan].members) {
    return { ok: false, error: "plan_limit" };
  }

  const token = generateToken();
  await db.transaction(async (tx) => {
    // Aynı kişiye bekleyen eski bir davet varsa yenisiyle değiştirilir.
    await tx
      .delete(invitations)
      .where(
        and(
          eq(invitations.organizationId, actor.organizationId),
          eq(sql`lower(${invitations.email})`, email.toLowerCase()),
          isNull(invitations.acceptedAt),
        ),
      );
    await tx.insert(invitations).values({
      organizationId: actor.organizationId,
      email: email.toLowerCase(),
      role,
      tokenHash: hashToken(token, env.SESSION_SECRET),
      invitedById: actor.userId,
      expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
    });
  });
  return { ok: true, token };
}

export function listPendingInvitations(organizationId: string) {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .orderBy(asc(invitations.createdAt));
}

export async function revokeInvitation(
  actor: Actor,
  invitationId: string,
): Promise<Result<"forbidden">> {
  if (!can(actor.role, "member:invite"))
    return { ok: false, error: "forbidden" };
  // organizationId koşulu şart: aksi halde başka ekibin davet id'sini bilen
  // biri onu silebilirdi.
  await db
    .delete(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.organizationId, actor.organizationId),
        isNull(invitations.acceptedAt),
      ),
    );
  return { ok: true };
}

/** Davet linki açıldığında gösterilecek bilgiler. */
export async function getInvitation(token: string) {
  const [row] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      organization: organizations,
      inviterName: users.name,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .leftJoin(users, eq(users.id, invitations.invitedById))
    .where(
      and(
        eq(invitations.tokenHash, hashToken(token, env.SESSION_SECRET)),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    );
  return row ?? null;
}

export async function acceptInvitation(
  token: string,
  user: User,
): Promise<
  | { ok: true; organization: Organization }
  | { ok: false; error: "invalid" | "email_mismatch" }
> {
  const invitation = await getInvitation(token);
  if (!invitation) return { ok: false, error: "invalid" };

  // Davet linki başkasının eline geçse bile sadece davet edilen e-postanın
  // sahibi katılabilir.
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, error: "email_mismatch" };
  }

  const accepted = await db.transaction(async (tx) => {
    // Kontrol ve işaretleme tek sorguda: aynı link iki kez kullanılamaz.
    const [row] = await tx
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(
        and(eq(invitations.id, invitation.id), isNull(invitations.acceptedAt)),
      )
      .returning({ id: invitations.id });
    if (!row) return false;

    // Davet linki bu e-posta adresine gönderildi; linke sahip olan kişi
    // adresin de sahibidir. Bu yüzden e-postayı doğrulanmış sayarız.
    if (!user.emailVerifiedAt) {
      await tx
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    await tx
      .insert(memberships)
      .values({
        userId: user.id,
        organizationId: invitation.organization.id,
        role: invitation.role,
      })
      .onConflictDoNothing();
    return true;
  });

  if (!accepted) return { ok: false, error: "invalid" };
  return { ok: true, organization: invitation.organization };
}
