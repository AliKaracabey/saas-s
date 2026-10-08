import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "./signature";

const secret = "whsec_test_secret";
const payload = JSON.stringify({ id: "evt_1", object: "event" });
const now = 1_700_000_000;
// Stripe SDK'sının kendi test yardımcısı; gerçek Stripe imzasıyla aynı formatı üretir.
const stripe = new Stripe("sk_test_123");

function sign(body: string, timestamp = now, key = secret) {
  return stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: key,
    timestamp,
  });
}

describe("verifyStripeSignature", () => {
  it("Stripe'ın imzaladığı isteği kabul eder", () => {
    expect(verifyStripeSignature(payload, sign(payload), secret, { now })).toBe(
      true,
    );
  });

  it("gövdesi değiştirilmiş isteği reddeder", () => {
    const header = sign(payload);
    const tampered = payload.replace("evt_1", "evt_2");
    expect(verifyStripeSignature(tampered, header, secret, { now })).toBe(
      false,
    );
  });

  it("başka bir secret ile imzalanmış isteği reddeder", () => {
    const header = sign(payload, now, "whsec_baska");
    expect(verifyStripeSignature(payload, header, secret, { now })).toBe(false);
  });

  it("5 dakikadan eski isteği reddeder (replay)", () => {
    const header = sign(payload, now - 301);
    expect(verifyStripeSignature(payload, header, secret, { now })).toBe(false);
  });

  it("birden fazla v1 imzasından biri doğruysa kabul eder", () => {
    const header = sign(payload).replace("v1=", "v1=00ff,v1=");
    expect(verifyStripeSignature(payload, header, secret, { now })).toBe(true);
  });

  it.each([null, "", "t=abc,v1=00", `t=${now}`, "v1=00ff"])(
    "bozuk başlığı reddeder: %s",
    (header) => {
      expect(verifyStripeSignature(payload, header, secret, { now })).toBe(
        false,
      );
    },
  );
});
