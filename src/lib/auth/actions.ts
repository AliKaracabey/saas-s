"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/server-env";
import { sendEmail } from "@/lib/email";
import { safeRedirectPath } from "@/lib/safe-redirect";
import {
  authenticate,
  createPasswordReset,
  createVerificationToken,
  registerUser,
  resetPassword,
} from "./account";
import { deleteSessionCookie, setSessionCookie } from "./cookie";
import { getCurrentSession } from "./current-user";
import { createSession, invalidateSession } from "./session";
import {
  emailSchema,
  firstError,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./validation";

/*
 * Formların çağırdığı server action'lar. Bunlar tarayıcıdan çağrılabilen
 * public uç noktalardır: gelen her veriyi doğrularız, hiçbirine güvenmeyiz.
 * İş kuralları account.ts ve session.ts içinde; burada sadece form okuma,
 * çerez ve yönlendirme var.
 */

export type FormState = { error?: string; message?: string } | undefined;

async function startSession(userId: string) {
  const h = await headers();
  const { token, session } = await createSession(userId, {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: h.get("user-agent"),
  });
  await setSessionCookie(token, session.expiresAt);
}

async function sendVerificationEmail(userId: string, email: string) {
  const token = await createVerificationToken(userId, "email_verification");
  await sendEmail({
    to: email,
    subject: "E-posta adresini doğrula",
    text: `Hesabını doğrulamak için linke tıkla (24 saat geçerli):\n${env.APP_URL}/email-dogrula?token=${token}`,
  });
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const result = await registerUser(parsed.data);
  if (!result.ok) {
    return { error: "Bu e-posta adresiyle kayıtlı bir hesap zaten var." };
  }

  await sendVerificationEmail(result.user.id, result.user.email);
  await startSession(result.user.id);
  redirect(safeRedirectPath(form.get("next")));
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const user = await authenticate(parsed.data.email, parsed.data.password);
  // "Böyle bir kullanıcı yok" ile "şifre yanlış" arasında ayrım yapmayız;
  // aksi halde hangi e-postaların kayıtlı olduğu öğrenilebilir.
  if (!user) return { error: "E-posta veya şifre hatalı." };

  await startSession(user.id);
  redirect(safeRedirectPath(form.get("next")));
}

export async function signOut(): Promise<void> {
  const { session } = await getCurrentSession();
  if (session) await invalidateSession(session.id);
  await deleteSessionCookie();
  redirect("/giris");
}

export async function resendVerification(): Promise<FormState> {
  const { user } = await getCurrentSession();
  if (!user) redirect("/giris");
  if (user.emailVerifiedAt)
    return { message: "E-posta adresin zaten doğrulanmış." };

  await sendVerificationEmail(user.id, user.email);
  return { message: "Doğrulama linkini tekrar gönderdik." };
}

export async function requestPasswordReset(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const reset = await createPasswordReset(parsed.data);
  if (reset) {
    await sendEmail({
      to: reset.user.email,
      subject: "Şifreni sıfırla",
      text: `Şifreni sıfırlamak için linke tıkla (1 saat geçerli):\n${env.APP_URL}/sifre-sifirla?token=${reset.token}\n\nBu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.`,
    });
  }

  // Hesap olsa da olmasa da aynı cevap: kayıtlı e-postalar sızmaz.
  return {
    message:
      "Bu adresle kayıtlı bir hesap varsa şifre sıfırlama linkini gönderdik.",
  };
}

export async function resetPasswordAction(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const userId = await resetPassword(parsed.data.token, parsed.data.password);
  if (!userId) {
    return {
      error: "Bu link geçersiz veya süresi dolmuş. Yeni bir link iste.",
    };
  }

  await startSession(userId);
  redirect("/panel");
}
