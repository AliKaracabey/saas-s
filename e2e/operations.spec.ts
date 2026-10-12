import { expect, test } from "@playwright/test";
import { CRON_SECRET } from "./env";

/* Canlıya almayla gelen uç noktalar ve başlıklar (adım 1.7). */

test("sağlık kontrolü veritabanına ulaşabildiğini söyler", async ({
  request,
}) => {
  const response = await request.get("/api/saglik");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

test("temizlik işini sadece doğru anahtarla çağırabilirsin", async ({
  request,
}) => {
  expect((await request.get("/api/cron/temizlik")).status()).toBe(401);
  expect(
    (
      await request.get("/api/cron/temizlik", {
        headers: { authorization: "Bearer yanlis-anahtar" },
      })
    ).status(),
  ).toBe(401);

  const response = await request.get("/api/cron/temizlik", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toHaveProperty("deleted.sessions");
});

test("sayfalar güvenlik başlıklarıyla gelir", async ({ request }) => {
  const response = await request.get("/giris");
  const headers = response.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-powered-by"]).toBeUndefined();
});
