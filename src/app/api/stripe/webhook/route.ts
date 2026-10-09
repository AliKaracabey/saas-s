import type Stripe from "stripe";
import { processStripeEvent } from "@/lib/billing/service";
import { verifyStripeSignature } from "@/lib/billing/signature";
import { billing, retrieveSubscription } from "@/lib/billing/stripe";

/*
 * Stripe'ın olay gönderdiği adres: POST /api/stripe/webhook
 *
 * Cevap kodları Stripe için anlamlı:
 * - 2xx: "aldım", Stripe tekrar göndermez.
 * - 400: imza geçersiz; bu istek Stripe'tan gelmemiş.
 * - 5xx: "şu an işleyemedim"; Stripe birkaç gün boyunca artan aralıklarla
 *   tekrar dener. İşleme sırasında hata olursa transaction geri alındığı
 *   için tekrar deneme güvenlidir.
 */
export async function POST(request: Request) {
  if (!billing) return new Response("Stripe ayarlanmamış", { status: 404 });

  // İmza, gövdenin ham haline göre hesaplanır. request.json() deyip tekrar
  // string'e çevirseydik boşluklar/sıra değişebilir ve imza tutmazdı.
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(payload, signature, billing.webhookSecret)) {
    return new Response("Geçersiz imza", { status: 400 });
  }

  const event = JSON.parse(payload) as Stripe.Event;
  try {
    const result = await processStripeEvent(event, retrieveSubscription);
    return Response.json({ received: true, result });
  } catch (error) {
    console.error(`[stripe] ${event.id} işlenemedi`, error);
    return new Response("İşlenemedi", { status: 500 });
  }
}
