import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Gerçek PostgreSQL gerektiren testler: `npm run test:db`
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    globalSetup: ["src/test/db-setup.ts"],
    // Testler aynı veritabanını paylaşır; paralel çalışırlarsa birbirinin
    // verisini silerler.
    fileParallelism: false,
  },
});
