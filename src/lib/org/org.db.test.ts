import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { invitations, subscriptions, users, type User } from "@/db/schema";
import { registerUser } from "@/lib/auth/account";
import {
  acceptInvitation,
  changeRole,
  createInvitation,
  createOrganization,
  deleteOrganization,
  getMembership,
  removeMember,
  revokeInvitation,
  type Actor,
} from "./service";

async function user(name: string): Promise<User> {
  const result = await registerUser({
    name,
    email: `${name}@ornek.com`,
    password: "cok-gizli-1",
  });
  if (!result.ok) throw new Error("kayıt başarısız");
  return result.user;
}

async function actorFor(u: User, slug: string): Promise<Actor> {
  const m = await getMembership(u.id, slug);
  if (!m) throw new Error(`${u.name} üye değil`);
  return { userId: u.id, organizationId: m.organization.id, role: m.role };
}

/** Owner'ın ekibine bir kişiyi davet edip kabul ettirir. */
async function join(owner: Actor, u: User, role: "admin" | "member") {
  const invite = await createInvitation(owner, u.email, role);
  if (!invite.ok) throw new Error(invite.error);
  const accepted = await acceptInvitation(invite.token, u);
  if (!accepted.ok) throw new Error(accepted.error);
}

beforeEach(async () => {
  await db.execute(sql`truncate users, organizations cascade`);
});

afterAll(async () => {
  await db.$client.end();
});

describe("organizasyon oluşturma", () => {
  it("kurucuyu owner yapar ve ücretsiz abonelik açar", async () => {
    const ali = await user("ali");
    const org = await createOrganization(ali.id, "Ali'nin Şirketi");

    expect(org.slug).toBe("alinin-sirketi");
    expect((await getMembership(ali.id, org.slug))?.role).toBe("owner");
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, org.id));
    expect(sub?.plan).toBe("free");
  });

  it("aynı adla ikinci organizasyona farklı bir slug verir", async () => {
    const ali = await user("ali");
    const a = await createOrganization(ali.id, "Demo");
    const b = await createOrganization(ali.id, "Demo");
    expect(a.slug).toBe("demo");
    expect(b.slug).toMatch(/^demo-[a-z0-9_-]{4}$/);
  });

  it("üye olmayan kullanıcı organizasyonu göremez", async () => {
    const ali = await user("ali");
    const ayse = await user("ayse");
    const org = await createOrganization(ali.id, "Demo");
    expect(await getMembership(ayse.id, org.slug)).toBeNull();
  });
});

describe("davetler", () => {
  it("davet edilen kişi linkle katılır", async () => {
    const ali = await user("ali");
    const ayse = await user("ayse");
    const org = await createOrganization(ali.id, "Demo");
    const owner = await actorFor(ali, org.slug);

    await join(owner, ayse, "admin");

    expect((await getMembership(ayse.id, org.slug))?.role).toBe("admin");
  });

  it("katılan kişinin e-postasını doğrulanmış sayar", async () => {
    const ali = await user("ali");
    const ayse = await user("ayse");
    const org = await createOrganization(ali.id, "Demo");
    await join(await actorFor(ali, org.slug), ayse, "member");

    const [row] = await db.select().from(users).where(eq(users.id, ayse.id));
    expect(row?.emailVerifiedAt).not.toBeNull();
  });

  it("link başka bir hesapla kullanılamaz", async () => {
    const ali = await user("ali");
    const ayse = await user("ayse");
    const mehmet = await user("mehmet");
    const org = await createOrganization(ali.id, "Demo");
    const invite = await createInvitation(
      await actorFor(ali, org.slug),
      ayse.email,
      "member",
    );

    expect(
      await acceptInvitation(invite.ok ? invite.token : "", mehmet),
    ).toEqual({ ok: false, error: "email_mismatch" });
  });

  it("link ikinci kez kullanılamaz", async () => {
    const ali = await user("ali");
    const ayse = await user("ayse");
    const org = await createOrganization(ali.id, "Demo");
    const invite = await createInvitation(
      await actorFor(ali, org.slug),
      ayse.email,
      "member",
    );
    const token = invite.ok ? invite.token : "";

    expect((await acceptInvitation(token, ayse)).ok).toBe(true);
    expect(await acceptInvitation(token, ayse)).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("süresi dolan veya iptal edilen davet kullanılamaz", async () => {
    const ali = await user("ali");
    const ayse = await user("ayse");
    const org = await createOrganization(ali.id, "Demo");
    const owner = await actorFor(ali, org.slug);

    const expired = await createInvitation(owner, ayse.email, "member");
    await db
      .update(invitations)
      .set({ expiresAt: new Date(Date.now() - 1000) });
    expect(
      (await acceptInvitation(expired.ok ? expired.token : "", ayse)).ok,
    ).toBe(false);

    const revoked = await createInvitation(owner, ayse.email, "member");
    const [row] = await db.select().from(invitations);
    await revokeInvitation(owner, row!.id);
    expect(
      (await acceptInvitation(revoked.ok ? revoked.token : "", ayse)).ok,
    ).toBe(false);
  });

  it("member davet gönderemez, admin owner daveti gönderemez", async () => {
    const ali = await user("ali");
    const ayse = await user("ayse");
    const mehmet = await user("mehmet");
    const org = await createOrganization(ali.id, "Demo");
    const owner = await actorFor(ali, org.slug);
    await join(owner, ayse, "admin");
    await join(owner, mehmet, "member");

    expect(
      await createInvitation(
        await actorFor(mehmet, org.slug),
        "x@ornek.com",
        "member",
      ),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(
      await createInvitation(
        await actorFor(ayse, org.slug),
        "x@ornek.com",
        "owner",
      ),
    ).toEqual({ ok: false, error: "forbidden" });
  });

  it("zaten üye olan kişiye davet gönderilmez", async () => {
    const ali = await user("ali");
    const org = await createOrganization(ali.id, "Demo");
    expect(
      await createInvitation(
        await actorFor(ali, org.slug),
        "ALI@ornek.com",
        "member",
      ),
    ).toEqual({ ok: false, error: "already_member" });
  });

  it("başka ekibin davetini iptal edemez", async () => {
    const ali = await user("ali");
    const ayse = await user("ayse");
    const aliOrg = await createOrganization(ali.id, "Ali");
    const ayseOrg = await createOrganization(ayse.id, "Ayşe");
    await createInvitation(
      await actorFor(ayse, ayseOrg.slug),
      "x@ornek.com",
      "member",
    );
    const [row] = await db.select().from(invitations);

    // Ali kendi ekibinin owner'ı ama davet Ayşe'nin ekibine ait.
    await revokeInvitation(await actorFor(ali, aliOrg.slug), row!.id);
    expect(await db.select().from(invitations)).toHaveLength(1);
  });
});

describe("roller ve üye çıkarma", () => {
  async function team() {
    const ali = await user("ali");
    const ayse = await user("ayse");
    const mehmet = await user("mehmet");
    const org = await createOrganization(ali.id, "Demo");
    const owner = await actorFor(ali, org.slug);
    await join(owner, ayse, "admin");
    await join(owner, mehmet, "member");
    return { ali, ayse, mehmet, org, owner };
  }

  it("admin bir üyeyi admin yapabilir", async () => {
    const { ayse, mehmet, org } = await team();
    const admin = await actorFor(ayse, org.slug);
    expect(await changeRole(admin, mehmet.id, "admin")).toEqual({ ok: true });
  });

  it("admin owner'ın rolünü değiştiremez ve kendini owner yapamaz", async () => {
    const { ali, ayse, org } = await team();
    const admin = await actorFor(ayse, org.slug);
    expect(await changeRole(admin, ali.id, "member")).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await changeRole(admin, ayse.id, "owner")).toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  it("tek owner kendini düşüremez ve ekipten ayrılamaz", async () => {
    const { ali, owner } = await team();
    expect(await changeRole(owner, ali.id, "admin")).toEqual({
      ok: false,
      error: "last_owner",
    });
    expect(await removeMember(owner, ali.id)).toEqual({
      ok: false,
      error: "last_owner",
    });
  });

  it("ikinci bir owner varsa ilk owner ayrılabilir", async () => {
    const { ali, ayse, owner, org } = await team();
    await changeRole(owner, ayse.id, "owner");
    expect(await removeMember(owner, ali.id)).toEqual({ ok: true });
    expect(await getMembership(ali.id, org.slug)).toBeNull();
  });

  it("member başkasını çıkaramaz ama kendisi ayrılabilir", async () => {
    const { ayse, mehmet, org } = await team();
    const member = await actorFor(mehmet, org.slug);
    expect(await removeMember(member, ayse.id)).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await removeMember(member, mehmet.id)).toEqual({ ok: true });
  });

  it("başka ekipteki bir kullanıcıya işlem yapılamaz", async () => {
    const { owner } = await team();
    const stranger = await user("yabanci");
    expect(await removeMember(owner, stranger.id)).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});

describe("organizasyonu silme", () => {
  it("sadece owner silebilir", async () => {
    const ali = await user("ali");
    const ayse = await user("ayse");
    const org = await createOrganization(ali.id, "Demo");
    const owner = await actorFor(ali, org.slug);
    await join(owner, ayse, "admin");

    expect(await deleteOrganization(await actorFor(ayse, org.slug))).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await deleteOrganization(owner)).toEqual({ ok: true });
    expect(await getMembership(ali.id, org.slug)).toBeNull();
  });
});
