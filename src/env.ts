import { z } from "zod";

/*
 * ALIŞTIRMA 1.1 — Sen yaz
 * Ayrıntılar: docs/alistirmalar/1.1-ortam-degiskenleri.md
 *
 * Amaç: Uygulama açılırken ortam değişkenlerini (process.env) bir kez
 * doğrulamak. Yanlış veya eksik bir ayar varsa uygulama hiç açılmamalı ve
 * hangi değişkenin hatalı olduğunu açıkça söylemeli.
 *
 * Bitirdiğinde src/env.test.ts içindeki `describe.skip` satırını
 * `describe` yap ve `npm test` ile tüm testleri yeşile çevir.
 */

export const envSchema = z.object({
  // TODO: NODE_ENV, DATABASE_URL, APP_URL, SESSION_SECRET, PORT
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  // TODO: envSchema ile doğrula; hata varsa hatalı değişken adlarını
  // listeleyen bir Error fırlat (değerleri asla mesaja yazma).
  void raw;
  throw new Error("parseEnv henüz yazılmadı");
}
