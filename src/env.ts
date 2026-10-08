import { z } from "zod";

/**
 * Uygulamanın tüm ayarlarını (ortam değişkenlerini) doğrulayan şema.
 *
 * process.env içindeki her değer `string | undefined` tipindedir ve
 * TypeScript bunların doğru olup olmadığını bilemez. Bu şema, uygulama
 * açılırken ayarları bir kez kontrol eder. Yanlış veya eksik bir ayar varsa
 * uygulama hiç açılmaz ("fail fast"). Açıklama: docs/notlar/1.1-ortam-degiskenleri.md
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "postgres:// ile başlamalı"),

  // Sondaki "/" silinir; böylece `${APP_URL}/giris` gibi birleştirmelerde
  // "//giris" oluşmaz.
  APP_URL: z.url().transform((url) => url.replace(/\/+$/, "")),

  // Kısa bir anahtar kaba kuvvetle tahmin edilebilir; 32 karakter alt sınırdır.
  SESSION_SECRET: z.string().min(32, "en az 32 karakter olmalı"),

  // Ortam değişkenleri hep metindir; coerce "8080" metnini 8080 sayısına çevirir.
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    // Bir değişken birden fazla kurala takılabilir; adları tekilleştiririz.
    // Değerleri asla mesaja yazmayız: loglara düşen bir SESSION_SECRET
    // güvenlik açığıdır.
    const names = new Set(result.error.issues.map((i) => i.path.join(".")));
    throw new Error(`Geçersiz ortam değişkenleri: ${[...names].join(", ")}`);
  }

  return result.data;
}
