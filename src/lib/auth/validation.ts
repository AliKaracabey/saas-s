import { z } from "zod";

// E-postalar boşluklardan arındırılıp küçük harfe çevrilerek saklanır.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Geçerli bir e-posta adresi gir."));

// Uzunluk karmaşıklıktan önemlidir. Üst sınır, çok uzun bir girdinin
// Argon2'yi meşgul edip sunucuyu yavaşlatmasını önler.
export const passwordSchema = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı.")
  .max(128, "Şifre en fazla 128 karakter olabilir.");

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Adını gir.")
    .max(100, "Ad en fazla 100 karakter olabilir."),
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Şifreni gir.").max(128),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "Şifreler eşleşmiyor.",
    path: ["passwordConfirm"],
  });

/** Zod hatasındaki ilk mesajı kullanıcıya gösterilecek metin olarak döndürür. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz bilgi.";
}
