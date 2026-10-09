import type { Plan, SubscriptionStatus } from "@/db/schema";

/*
 * Planların sınırları ve abonelik durumundan plana geçiş kuralı. Saf
 * fonksiyonlar: veritabanı ya da Stripe bilmez, kolayca test edilir.
 */

export const planLimits = {
  free: { members: 5 },
  pro: { members: 50 },
} as const satisfies Record<Plan, { members: number }>;

export const planLabels: Record<Plan, string> = {
  free: "Ücretsiz",
  pro: "Pro",
};

export const statusLabels: Record<SubscriptionStatus, string> = {
  trialing: "Deneme süresinde",
  active: "Aktif",
  past_due: "Ödeme gecikti",
  canceled: "İptal edildi",
  incomplete: "Ödeme bekleniyor",
  incomplete_expired: "Ödeme tamamlanmadı",
  unpaid: "Ödenmedi",
  paused: "Duraklatıldı",
};

/**
 * Stripe'taki abonelik durumuna göre ekibin hangi planın özelliklerini
 * kullanacağı. "past_due" (kart reddedildi, Stripe tekrar deniyor) bir
 * hoşgörü süresidir: kullanıcıyı hemen düşürmüyoruz. Stripe denemeleri
 * bitirince durum "unpaid" ya da "canceled" olur ve plan ücretsize döner.
 */
export function planForStatus(status: SubscriptionStatus): Plan {
  return status === "active" || status === "trialing" || status === "past_due"
    ? "pro"
    : "free";
}

export function isSubscriptionStatus(
  status: string,
): status is SubscriptionStatus {
  return status in statusLabels;
}
