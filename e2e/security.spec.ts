import Stripe from "stripe";
import { expect, test } from "@playwright/test";
import { WEBHOOK_SECRET } from "./env";

/*
 * Tarayıcı açmadan doğrudan HTTP istekleri gönderen testler (`request`).
 * Saldırganın da tarayıcı kullanmak zorunda olmadığını unutma.
 */

test("giriş yapmamış kullanıcı korumalı sayfalardan girişe yönlenir", async ({
  page,
}) => {
  for (const path of ["/panel", "/org/herhangi-bir-ekip"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/giris/);
  }
});

test("başka bir siteden gelen POST isteği reddedilir (CSRF)", async ({
  request,
}) => {
  const response = await request.post("/giris", {
    headers: { origin: "https://kotu-site.com" },
  });
  expect(response.status()).toBe(403);
});

test.describe("Stripe webhook", () => {
  const payload = JSON.stringify({
    id: "evt_e2e",
    object: "event",
    type: "invoice.paid",
    data: { object: {} },
  });

  test("Stripe'ın imzaladığı olayı kabul eder", async ({ request }) => {
    const signature = new Stripe(
      "sk_test_e2e",
    ).webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const response = await request.post("/api/stripe/webhook", {
      data: payload,
      headers: {
        "stripe-signature": signature,
        "content-type": "application/json",
      },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ result: "ignored" });
  });

  test("imzası tutmayan olayı reddeder", async ({ request }) => {
    const response = await request.post("/api/stripe/webhook", {
      data: payload,
      headers: {
        "stripe-signature": "t=1,v1=00",
        "content-type": "application/json",
      },
    });
    expect(response.status()).toBe(400);
  });
});
