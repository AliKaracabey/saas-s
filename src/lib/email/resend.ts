import type { Email } from "./index";

/*
 * Resend (https://resend.com) ile e-posta gönderir. SDK yerine doğrudan HTTP
 * API'sini kullanıyoruz: tek bir POST isteği, ekstra paket yok.
 *
 * Bu dosya ortam değişkenlerini kendisi okumaz; anahtar ve fetch dışarıdan
 * verilir. Böylece testte gerçek bir istek atmadan sahte fetch ile denenir.
 */

export type ResendConfig = { apiKey: string; from: string };

export async function sendWithResend(
  email: Email,
  config: ResendConfig,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
    }),
  });
  if (!response.ok) {
    // Hata mesajı Resend'in cevabından gelir (ör. "domain doğrulanmamış").
    // API anahtarını asla loglamıyoruz.
    throw new Error(
      `Resend ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }
}
