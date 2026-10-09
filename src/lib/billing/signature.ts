import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Stripe webhook imzasını doğrular.
 *
 * Webhook adresimiz internete açık: herkes oraya "ödeme alındı" diye sahte bir
 * istek gönderebilir. Stripe bu yüzden her isteğe bir imza koyar:
 *
 *   Stripe-Signature: t=1700000000,v1=5257a869e7...
 *
 * v1, `${t}.${gövde}` metninin webhook secret'ı (whsec_...) anahtar olarak
 * kullanılarak alınmış HMAC-SHA256'sıdır. Secret'ı sadece Stripe ve biz
 * bildiğimiz için doğru imzayı sadece Stripe üretebilir.
 *
 * t (zaman damgası) da imzanın içinde. Böylece eski bir isteği kaydedip
 * tekrar gönderen biri (replay saldırısı) 5 dakika sonra reddedilir.
 *
 * Stripe SDK'sında bunu yapan `stripe.webhooks.constructEvent` var; burada
 * nasıl çalıştığını görmek için kendimiz yazdık. Testlerde SDK'nın ürettiği
 * imzalarla uyumlu olduğunu da kontrol ediyoruz.
 */

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  options: { now?: number; toleranceSeconds?: number } = {},
): boolean {
  if (!header) return false;

  let timestamp: number | undefined;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = Number(value);
    // Stripe secret'ı yenilerken bir süre iki imza birden gönderebilir.
    if (key === "v1" && value) signatures.push(value);
  }
  if (!timestamp || !Number.isFinite(timestamp) || signatures.length === 0) {
    return false;
  }

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (Math.abs(now - timestamp) > tolerance) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest();

  // `===` ile karşılaştırmak, ilk farklı karakterde durduğu için cevabın
  // süresinden imzanın kaçıncı karaktere kadar doğru olduğu sızabilir.
  // timingSafeEqual her zaman aynı sürede çalışır.
  return signatures.some((signature) => {
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
