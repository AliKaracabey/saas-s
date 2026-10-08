import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  // "server-only" tarayıcı dışında içe aktarılınca hata fırlatır; testlerde
  // boş bir modülle değiştiriyoruz.
  "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.db.test.ts", "node_modules/**"],
  },
});
