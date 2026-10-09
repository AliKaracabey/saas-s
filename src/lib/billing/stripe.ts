import "server-only";
import Stripe from "stripe";
import { env } from "@/server-env";
import { toSnapshot } from "./service";

/*
 * Stripe istemcisi. STRIPE_* değişkenleri verilmemişse `billing` null olur ve
 * faturalandırma sayfası "ödeme ayarlanmamış" der; uygulamanın geri kalanı
 * Stripe olmadan da çalışır. (env.ts üçünün birlikte verilmesini zorunlu
 * tutuyor, o yüzden burada tek tek kontrol etmemiz gerekmiyor.)
 */
export const billing =
  env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_PRO
    ? {
        stripe: new Stripe(env.STRIPE_SECRET_KEY),
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        pricePro: env.STRIPE_PRICE_PRO,
      }
    : null;

/** Aboneliğin Stripe'taki en güncel halini getirir. */
export async function retrieveSubscription(id: string) {
  if (!billing) throw new Error("Stripe ayarlanmamış");
  return toSnapshot(await billing.stripe.subscriptions.retrieve(id));
}
