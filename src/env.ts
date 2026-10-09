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

  // Verilirse gönderilen e-postalar bu dosyaya da (her satıra bir JSON)
  // yazılır. Uçtan uca testler doğrulama ve davet linklerini buradan okur.
  EMAIL_OUTBOX_FILE: z.string().min(1).optional(),

  // GitHub ile giriş için (isteğe bağlı). İkisi de verilmezse giriş
  // sayfasında GitHub butonu görünmez.
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

  // Stripe ile ödeme için (isteğe bağlı). Üçü de verilmezse faturalandırma
  // sayfası "ödeme ayarlanmamış" der, uygulamanın geri kalanı çalışır.
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  STRIPE_PRICE_PRO: z.string().startsWith("price_").optional(),

  // Gerçek e-posta gönderimi için Resend (isteğe bağlı, ikisi birlikte).
  // Verilmezse e-postalar sunucu konsoluna yazılır.
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  EMAIL_FROM: z.string().min(3).optional(),

  // Zamanlanmış temizlik işini (/api/cron/temizlik) sadece Vercel'in
  // çağırabilmesi için gizli anahtar. Verilmezse o adres kapalıdır.
  CRON_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;

// Boş bırakılmış değişkenleri ("GITHUB_CLIENT_ID=") hiç verilmemiş sayarız.
function dropEmpty(raw: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== ""),
  );
}

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema
    .refine((env) => !env.GITHUB_CLIENT_ID === !env.GITHUB_CLIENT_SECRET, {
      message: "ikisi birlikte verilmeli",
      path: ["GITHUB_CLIENT_ID"],
    })
    .refine(
      (env) => {
        const set = [
          env.STRIPE_SECRET_KEY,
          env.STRIPE_WEBHOOK_SECRET,
          env.STRIPE_PRICE_PRO,
        ].filter(Boolean).length;
        return set === 0 || set === 3;
      },
      { message: "üçü birlikte verilmeli", path: ["STRIPE_SECRET_KEY"] },
    )
    .refine((env) => !env.RESEND_API_KEY === !env.EMAIL_FROM, {
      message: "ikisi birlikte verilmeli",
      path: ["RESEND_API_KEY"],
    })
    // Canlıda oturum çerezi sadece HTTPS üzerinden gönderilir (secure).
    // APP_URL yanlışlıkla http:// verilirse e-postadaki linkler ve OAuth
    // dönüşü bozulur; bunu açılışta yakalarız. localhost istisna: uygulamayı
    // kendi bilgisayarında `next start` ile denerken HTTPS yok.
    .refine(
      (env) =>
        env.NODE_ENV !== "production" ||
        env.APP_URL.startsWith("https://") ||
        /^http:\/\/localhost(:\d+)?$/.test(env.APP_URL),
      { message: "canlıda https olmalı", path: ["APP_URL"] },
    )
    .safeParse(dropEmpty(raw));

  if (!result.success) {
    // Bir değişken birden fazla kurala takılabilir; adları tekilleştiririz.
    // Değerleri asla mesaja yazmayız: loglara düşen bir SESSION_SECRET
    // güvenlik açığıdır.
    const names = new Set(result.error.issues.map((i) => i.path.join(".")));
    throw new Error(`Geçersiz ortam değişkenleri: ${[...names].join(", ")}`);
  }

  return result.data;
}
