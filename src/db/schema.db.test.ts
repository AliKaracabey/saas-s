import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { TEST_DATABASE_URL } from "@/test/db-setup";
import * as schema from "./schema";

const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });
const { users, organizations, memberships, sessions, invitations } = schema;

// Postgres kısıt ihlallerinde hatanın "cause" alanında bir SQLSTATE kodu
// döndürür: 23505 = unique ihlali.
const UNIQUE_VIOLATION = { cause: expect.objectContaining({ code: "23505" }) };

async function createUser(email: string) {
  const [user] = await db
    .insert(users)
    .values({ email, name: email.split("@")[0]! })
    .returning();
  return user!;
}

async function createOrg(slug: string) {
  const [org] = await db
    .insert(organizations)
    .values({ name: slug, slug })
    .returning();
  return org!;
}

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000);

beforeEach(async () => {
  await db.execute(
    sql`truncate users, organizations, memberships, sessions, invitations, subscriptions cascade`,
  );
});

afterAll(() => client.end());

describe("users", () => {
  it("e-postayı büyük-küçük harf duyarsız tekil tutar", async () => {
    await createUser("ali@ornek.com");
    await expect(createUser("ALI@ornek.com")).rejects.toMatchObject(
      UNIQUE_VIOLATION,
    );
  });

  it("silinince üyelikleri ve oturumları da silinir", async () => {
    const user = await createUser("ali@ornek.com");
    const org = await createOrg("demo");
    await db
      .insert(memberships)
      .values({ userId: user.id, organizationId: org.id });
    await db
      .insert(sessions)
      .values({ id: "token-ozeti", userId: user.id, expiresAt: inOneHour() });

    await db.delete(users).where(eq(users.id, user.id));

    expect(await db.select().from(memberships)).toHaveLength(0);
    expect(await db.select().from(sessions)).toHaveLength(0);
    // Organizasyon kullanıcıya ait değildir, yerinde kalır.
    expect(await db.select().from(organizations)).toHaveLength(1);
  });
});

describe("memberships", () => {
  it("aynı kullanıcı aynı organizasyona iki kez üye olamaz", async () => {
    const user = await createUser("ali@ornek.com");
    const org = await createOrg("demo");
    await db
      .insert(memberships)
      .values({ userId: user.id, organizationId: org.id });

    await expect(
      db
        .insert(memberships)
        .values({ userId: user.id, organizationId: org.id, role: "admin" }),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);
  });

  it("bir kullanıcının her organizasyonda farklı bir rolü olabilir", async () => {
    const user = await createUser("ali@ornek.com");
    const a = await createOrg("a");
    const b = await createOrg("b");
    await db.insert(memberships).values([
      { userId: user.id, organizationId: a.id, role: "owner" },
      { userId: user.id, organizationId: b.id, role: "member" },
    ]);

    const rows = await db
      .select({ slug: organizations.slug, role: memberships.role })
      .from(memberships)
      .innerJoin(
        organizations,
        eq(organizations.id, memberships.organizationId),
      )
      .where(eq(memberships.userId, user.id))
      .orderBy(organizations.slug);

    expect(rows).toEqual([
      { slug: "a", role: "owner" },
      { slug: "b", role: "member" },
    ]);
  });
});

describe("invitations", () => {
  it("aynı kişiye aynı anda tek açık davet gönderilebilir", async () => {
    const org = await createOrg("demo");
    const invite = (tokenHash: string, email: string) =>
      db.insert(invitations).values({
        organizationId: org.id,
        email,
        tokenHash,
        expiresAt: inOneHour(),
      });

    await invite("t1", "ayse@ornek.com");
    await expect(invite("t2", "Ayse@Ornek.com")).rejects.toMatchObject(
      UNIQUE_VIOLATION,
    );

    // İlk davet kabul edildikten sonra yeni davet gönderilebilir.
    await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.tokenHash, "t1"));
    await expect(invite("t3", "ayse@ornek.com")).resolves.toBeDefined();
  });

  it("daveti gönderen silinirse davet kalır, gönderen boşalır", async () => {
    const inviter = await createUser("ali@ornek.com");
    const org = await createOrg("demo");
    await db.insert(invitations).values({
      organizationId: org.id,
      email: "ayse@ornek.com",
      tokenHash: "t1",
      invitedById: inviter.id,
      expiresAt: inOneHour(),
    });

    await db.delete(users).where(eq(users.id, inviter.id));

    const [invitation] = await db.select().from(invitations);
    expect(invitation?.invitedById).toBeNull();
  });
});

describe("subscriptions", () => {
  it("bir organizasyonun tek aboneliği olur ve onunla birlikte silinir", async () => {
    const org = await createOrg("demo");
    await db.insert(schema.subscriptions).values({ organizationId: org.id });
    await expect(
      db.insert(schema.subscriptions).values({ organizationId: org.id }),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);

    await db.delete(organizations).where(eq(organizations.id, org.id));
    expect(await db.select().from(schema.subscriptions)).toHaveLength(0);
  });
});
