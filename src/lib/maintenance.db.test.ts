import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  invitations,
  sessions,
  stripeEvents,
  verificationTokens,
} from "@/db/schema";
import { registerUser } from "@/lib/auth/account";
import { createOrganization } from "@/lib/org/service";
import { cleanupExpiredData } from "./maintenance";

const DAY = 24 * 60 * 60 * 1000;
const past = new Date(Date.now() - DAY);
const future = new Date(Date.now() + DAY);

beforeEach(async () => {
  await db.execute(sql`truncate users, organizations, stripe_events cascade`);
});

afterAll(async () => {
  await db.$client.end();
});

describe("cleanupExpiredData", () => {
  it("sadece süresi dolmuş kayıtları siler", async () => {
    const result = await registerUser({
      name: "ali",
      email: "ali@ornek.com",
      password: "cok-gizli-1",
    });
    if (!result.ok) throw new Error("kayıt başarısız");
    const userId = result.user.id;
    const org = await createOrganization(userId, "Ekip");

    // registerUser bir doğrulama token'ı açıyor; onu da sayıya katıyoruz.
    await db.delete(verificationTokens);
    await db.insert(sessions).values([
      { id: "eski", userId, expiresAt: past },
      { id: "gecerli", userId, expiresAt: future },
    ]);
    await db.insert(verificationTokens).values([
      {
        tokenHash: "eski",
        userId,
        purpose: "email_verification",
        expiresAt: past,
      },
      {
        tokenHash: "gecerli",
        userId,
        purpose: "email_verification",
        expiresAt: future,
      },
    ]);
    const invitation = {
      organizationId: org.id,
      role: "member" as const,
      invitedById: userId,
    };
    await db.insert(invitations).values([
      { ...invitation, email: "a@ornek.com", tokenHash: "a", expiresAt: past },
      {
        ...invitation,
        email: "b@ornek.com",
        tokenHash: "b",
        expiresAt: future,
      },
      // Kabul edilmiş davet, süresi dolmuş olsa bile kayıt olarak kalır.
      {
        ...invitation,
        email: "c@ornek.com",
        tokenHash: "c",
        expiresAt: past,
        acceptedAt: past,
      },
    ]);
    await db.insert(stripeEvents).values([
      {
        id: "evt_eski",
        type: "x",
        processedAt: new Date(Date.now() - 31 * DAY),
      },
      { id: "evt_yeni", type: "x" },
    ]);

    expect(await cleanupExpiredData()).toEqual({
      sessions: 1,
      verificationTokens: 1,
      invitations: 1,
      stripeEvents: 1,
    });

    expect((await db.select().from(sessions)).map((s) => s.id)).toEqual([
      "gecerli",
    ]);
    expect(await db.select().from(invitations)).toHaveLength(2);
    expect((await db.select().from(stripeEvents)).map((e) => e.id)).toEqual([
      "evt_yeni",
    ]);
  });
});
