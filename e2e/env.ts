/*
 * Uçtan uca testlerde çalışan uygulamanın ortamı. Geliştirme veritabanına
 * dokunmamak için ayrı bir veritabanı (saas_e2e) ve ayrı bir port (3100)
 * kullanılır; yani `npm run dev` açıkken de testleri çalıştırabilirsin.
 */
import path from "node:path";

const base = new URL(
  process.env.TEST_DATABASE_URL ?? "postgres://saas:saas@localhost:5432/saas",
);
base.pathname = "/saas_e2e";

export const E2E_PORT = 3100;
export const E2E_URL = `http://localhost:${E2E_PORT}`;
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? base.toString();
export const OUTBOX_FILE = path.resolve("test-results/e2e-outbox.jsonl");
export const WEBHOOK_SECRET = "whsec_e2e_test";

export const serverEnv: Record<string, string> = {
  DATABASE_URL: E2E_DATABASE_URL,
  APP_URL: E2E_URL,
  PORT: String(E2E_PORT),
  SESSION_SECRET: "e2e-icin-en-az-otuz-iki-karakterlik-anahtar",
  EMAIL_OUTBOX_FILE: OUTBOX_FILE,
  // Senin .env dosyandaki gerçek anahtarlar testlere karışmasın diye bunları
  // biz veriyoruz. (Next.js .env'i yüklerken zaten tanımlı olanları ezmez.)
  // Stripe anahtarları sahte: testler Stripe'a hiç istek atmaz, sadece
  // webhook imzasını ve faturalandırma sayfasını dener.
  STRIPE_SECRET_KEY: "sk_test_e2e",
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  STRIPE_PRICE_PRO: "price_e2e",
  GITHUB_CLIENT_ID: "",
  GITHUB_CLIENT_SECRET: "",
};
