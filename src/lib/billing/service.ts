import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import {
  stripeEvents,
  subscriptions,
  type SubscriptionStatus,
} from "@/db/schema";
import { planForStatus } from "./plans";

/*
 * Abonelik verisinin tek doğru kaynağı Stripe'tır. Bizim `subscriptions`
 * tablomuz onun bir kopyası: sayfaları hızlı göstermek ve plan sınırlarını
 * kontrol etmek için. Kopyayı sadece webhook'lar günceller; kullanıcı
 * "ödeme başarılı" sayfasına döndü diye planı Pro yapmayız, çünkü o adresi
 * herkes elle açabilir.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Stripe aboneliğinden bizim ihtiyacımız olan alanlar. */
export type SubscriptionSnapshot = {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  organizationId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toSnapshot(sub: Stripe.Subscription): SubscriptionSnapshot {
  const organizationId = sub.metadata.organizationId;
  // Dönem sonu yeni API sürümlerinde abonelik kalemlerinin (items) üzerinde.
  const periodEnd = sub.items.data[0]?.current_period_end;
  return {
    id: sub.id,
    customerId:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    status: sub.status as SubscriptionStatus,
    organizationId:
      organizationId && UUID.test(organizationId) ? organizationId : null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    // Müşteri portalı iptali "dönem sonunda" ya da belirli bir tarihte
    // (cancel_at) yapabilir; ikisi de "yenilenmeyecek" demek.
    cancelAtPeriodEnd: sub.cancel_at_period_end || sub.cancel_at !== null,
  };
}

export async function getSubscription(organizationId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId));
  return row ?? null;
}

/**
 * Stripe'taki aboneliği bizim tabloya yazar. Ekibi önce Checkout'ta
 * aboneliğe koyduğumuz metadata'dan, yoksa Stripe müşteri id'sinden buluruz.
 * Hangi ekibe ait olduğu bulunamazsa false döner.
 */
export async function syncSubscription(
  snapshot: SubscriptionSnapshot,
  tx: Tx | typeof db = db,
): Promise<boolean> {
  const where = snapshot.organizationId
    ? eq(subscriptions.organizationId, snapshot.organizationId)
    : eq(subscriptions.stripeCustomerId, snapshot.customerId);

  const [current] = await tx
    .select()
    .from(subscriptions)
    .where(where)
    .for("update");
  if (!current) return false;

  const plan = planForStatus(snapshot.status);

  // Ekip eski aboneliğini iptal edip yenisini başlatmış olabilir. Eski
  // aboneliğin geç gelen "iptal edildi" olayı yeni, aktif aboneliğin
  // üzerine yazmasın.
  if (
    current.stripeSubscriptionId &&
    current.stripeSubscriptionId !== snapshot.id &&
    plan === "free"
  ) {
    return true;
  }

  await tx
    .update(subscriptions)
    .set({
      plan,
      status: snapshot.status,
      stripeCustomerId: snapshot.customerId,
      stripeSubscriptionId: snapshot.id,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    })
    .where(eq(subscriptions.id, current.id));
  return true;
}

/** Bu olay bir aboneliği ilgilendiriyorsa aboneliğin id'si. */
export function subscriptionIdFromEvent(event: Stripe.Event): string | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const sub = event.data.object.subscription;
      if (!sub) return null;
      return typeof sub === "string" ? sub : sub.id;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return event.data.object.id;
    default:
      return null;
  }
}

export type ProcessResult = "processed" | "duplicate" | "ignored";

/**
 * Bir webhook olayını işler.
 *
 * 1. Olay sırası: Stripe olayların sırasını garanti etmez; "updated" olayı
 *    "created"tan önce gelebilir. Olayın içindeki (o anki) veriyi değil,
 *    aboneliğin Stripe'taki en güncel halini kullanırız (`retrieve`). Böylece
 *    hangi sırayla gelirse gelsin sonuç doğru olur.
 * 2. Tekrar: Stripe bir olayı birden fazla kez gönderebilir (cevabımız
 *    zaman aşımına uğrarsa tekrar dener). Olay id'sini `stripe_events`
 *    tablosuna, abonelik güncellemesiyle aynı transaction içinde yazarız.
 *    İkinci geliş primary key'e takılır ve hiçbir şey yapılmaz. Güncelleme
 *    hata verirse transaction geri alınır, olay "işlenmemiş" kalır ve
 *    Stripe'ın bir sonraki denemesi tekrar işler.
 *
 * `retrieve` parametre olarak alınıyor ki testlerde gerçek Stripe'a
 * gitmeden sahte bir abonelik verebilelim.
 */
export async function processStripeEvent(
  event: Stripe.Event,
  retrieve: (subscriptionId: string) => Promise<SubscriptionSnapshot>,
): Promise<ProcessResult> {
  const subscriptionId = subscriptionIdFromEvent(event);
  if (!subscriptionId) return "ignored";

  const snapshot = await retrieve(subscriptionId);

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(stripeEvents)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ id: stripeEvents.id });
    if (inserted.length === 0) return "duplicate";

    const found = await syncSubscription(snapshot, tx);
    if (!found) {
      console.warn(
        `[stripe] ${event.id}: ${snapshot.id} aboneliğinin ekibi bulunamadı`,
      );
    }
    return "processed";
  });
}

/**
 * Ekibin Stripe müşteri id'sini döner; yoksa `create` ile oluşturup kaydeder.
 * Aynı anda iki istek gelirse ikisi de müşteri oluşturabilir ama sadece
 * ilki kaydedilir (`stripeCustomerId IS NULL` koşulu), ikisi de aynı id'yi
 * kullanır.
 */
export async function ensureStripeCustomer(
  organizationId: string,
  create: () => Promise<string>,
): Promise<string> {
  const current = await getSubscription(organizationId);
  if (!current) throw new Error("Ekibin abonelik kaydı yok");
  if (current.stripeCustomerId) return current.stripeCustomerId;

  const customerId = await create();
  const [updated] = await db
    .update(subscriptions)
    .set({ stripeCustomerId: customerId })
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        isNull(subscriptions.stripeCustomerId),
      ),
    )
    .returning({ customerId: subscriptions.stripeCustomerId });
  if (updated?.customerId) return updated.customerId;

  const winner = await getSubscription(organizationId);
  return winner!.stripeCustomerId!;
}
