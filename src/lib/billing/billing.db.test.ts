import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { stripeEvents, subscriptions } from "@/db/schema";
import { registerUser } from "@/lib/auth/account";
import { createOrganization } from "@/lib/org/service";
import {
  ensureStripeCustomer,
  getSubscription,
  processStripeEvent,
  syncSubscription,
  type SubscriptionSnapshot,
} from "./service";

let orgId: string;

beforeEach(async () => {
  await db.execute(sql`truncate users, organizations, stripe_events cascade`);
  const result = await registerUser({
    name: "ali",
    email: "ali@ornek.com",
    password: "cok-gizli-1",
  });
  if (!result.ok) throw new Error("kayıt başarısız");
  orgId = (await createOrganization(result.user.id, "Ekip")).id;
});

afterAll(async () => {
  await db.$client.end();
});

function snapshot(
  overrides: Partial<SubscriptionSnapshot> = {},
): SubscriptionSnapshot {
  return {
    id: "sub_1",
    customerId: "cus_1",
    status: "active",
    organizationId: orgId,
    currentPeriodEnd: new Date("2026-11-08T00:00:00Z"),
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

/** Testlerde sadece id, type ve abonelik id'si önemli. */
function event(id: string, subscriptionId = "sub_1"): Stripe.Event {
  return {
    id,
    type: "customer.subscription.updated",
    data: { object: { id: subscriptionId } },
  } as unknown as Stripe.Event;
}

describe("syncSubscription", () => {
  it("aktif aboneliği Pro olarak yazar", async () => {
    await syncSubscription(snapshot());
    const sub = await getSubscription(orgId);
    expect(sub).toMatchObject({
      plan: "pro",
      status: "active",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      cancelAtPeriodEnd: false,
    });
    expect(sub?.currentPeriodEnd?.toISOString()).toBe(
      "2026-11-08T00:00:00.000Z",
    );
  });

  it("iptal edilen abonelik ekibi ücretsiz plana döndürür", async () => {
    await syncSubscription(snapshot());
    await syncSubscription(snapshot({ status: "canceled" }));
    expect((await getSubscription(orgId))?.plan).toBe("free");
  });

  it("metadata yoksa ekibi müşteri id'sinden bulur", async () => {
    await syncSubscription(snapshot());
    await syncSubscription(
      snapshot({ organizationId: null, cancelAtPeriodEnd: true }),
    );
    expect((await getSubscription(orgId))?.cancelAtPeriodEnd).toBe(true);
  });

  it("ekibi bulunamayan aboneliği yok sayar", async () => {
    expect(
      await syncSubscription(
        snapshot({ organizationId: null, customerId: "cus_yabanci" }),
      ),
    ).toBe(false);
  });

  it("eski aboneliğin iptali yeni aktif aboneliği bozmaz", async () => {
    await syncSubscription(snapshot({ id: "sub_yeni" }));
    await syncSubscription(snapshot({ id: "sub_eski", status: "canceled" }));
    expect(await getSubscription(orgId)).toMatchObject({
      plan: "pro",
      stripeSubscriptionId: "sub_yeni",
    });
  });
});

describe("processStripeEvent", () => {
  it("aynı olayı iki kez işlemez", async () => {
    const retrieve = vi.fn(async () => snapshot());

    expect(await processStripeEvent(event("evt_1"), retrieve)).toBe(
      "processed",
    );
    // Arada biri planı elle değiştirse bile tekrar gelen olay dokunmamalı.
    await db
      .update(subscriptions)
      .set({ plan: "free" })
      .where(eq(subscriptions.organizationId, orgId));
    expect(await processStripeEvent(event("evt_1"), retrieve)).toBe(
      "duplicate",
    );
    expect((await getSubscription(orgId))?.plan).toBe("free");
  });

  it("olaydaki eski veriyi değil Stripe'taki güncel hali kullanır", async () => {
    // Önce "iptal" olayı işlenir, sonra geç gelen eski "updated" olayı.
    // İkisinde de Stripe'tan alınan güncel durum "canceled".
    const retrieve = vi.fn(async () => snapshot({ status: "canceled" }));
    await processStripeEvent(event("evt_iptal"), retrieve);
    await processStripeEvent(event("evt_eski_guncelleme"), retrieve);
    expect((await getSubscription(orgId))?.plan).toBe("free");
    expect(retrieve).toHaveBeenCalledWith("sub_1");
  });

  it("hata olursa olayı işlenmemiş bırakır, tekrar deneme çalışır", async () => {
    await expect(
      processStripeEvent(event("evt_hata"), async () => {
        throw new Error("Stripe'a ulaşılamadı");
      }),
    ).rejects.toThrow();
    expect(await db.select().from(stripeEvents)).toHaveLength(0);

    expect(
      await processStripeEvent(event("evt_hata"), async () => snapshot()),
    ).toBe("processed");
  });

  it("aboneliği ilgilendirmeyen olayları yok sayar", async () => {
    const retrieve = vi.fn();
    const other = { id: "evt_x", type: "invoice.paid", data: { object: {} } };
    expect(
      await processStripeEvent(other as unknown as Stripe.Event, retrieve),
    ).toBe("ignored");
    expect(retrieve).not.toHaveBeenCalled();
  });
});

describe("ensureStripeCustomer", () => {
  it("müşteriyi bir kez oluşturur, sonra aynısını döner", async () => {
    const create = vi.fn(async () => "cus_yeni");
    expect(await ensureStripeCustomer(orgId, create)).toBe("cus_yeni");
    expect(await ensureStripeCustomer(orgId, create)).toBe("cus_yeni");
    expect(create).toHaveBeenCalledTimes(1);
  });
});
