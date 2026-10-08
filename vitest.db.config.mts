import { defineConfig } from "vitest/config";
import { alias } from "./vitest.config.mts";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://saas:saas@localhost:5432/saas_test";

// Gerçek PostgreSQL gerektiren testler: `npm run test:db`
export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    globalSetup: ["src/test/db-setup.ts"],
    // Uygulama kodu (src/db/index.ts) bu ayarlarla test veritabanına bağlanır.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
      APP_URL: "http://localhost:3000",
      SESSION_SECRET: "test-icin-en-az-otuz-iki-karakterlik-anahtar",
    },
    // Testler aynı veritabanını paylaşır; paralel çalışırlarsa birbirinin
    // verisini silerler.
    fileParallelism: false,
  },
});
