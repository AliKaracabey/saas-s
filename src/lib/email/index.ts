import "server-only";
import { appendFile } from "node:fs/promises";
import { env } from "@/server-env";
import { sendWithResend } from "./resend";

export type Email = { to: string; subject: string; text: string };

/*
 * E-posta gönderimi.
 *
 * - RESEND_API_KEY verilmişse (canlıda) e-posta Resend ile gerçekten
 *   gönderilir.
 * - Verilmemişse (geliştirirken) e-posta sunucu konsoluna yazılır;
 *   doğrulama ve sıfırlama linklerini terminalden kopyalayabilirsin.
 * - EMAIL_OUTBOX_FILE verilmişse e-posta o dosyaya da eklenir. Uçtan uca
 *   testler (e2e/) linkleri oradan okur.
 *
 * Gönderim başarısız olursa hatayı loglar ama fırlatmaz. Kayıt olan
 * kullanıcının hesabı açılmış olur; doğrulama e-postası gelmediyse panelden
 * "tekrar gönder" diyebilir. E-posta servisindeki bir arıza kayıt ve davet
 * akışlarını tamamen durdurmasın istiyoruz.
 */
export async function sendEmail(email: Email): Promise<void> {
  if (env.EMAIL_OUTBOX_FILE) {
    await appendFile(env.EMAIL_OUTBOX_FILE, JSON.stringify(email) + "\n");
  }

  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    try {
      await sendWithResend(email, {
        apiKey: env.RESEND_API_KEY,
        from: env.EMAIL_FROM,
      });
    } catch (error) {
      console.error(`[e-posta] ${email.to} adresine gönderilemedi`, error);
    }
    return;
  }

  if (env.NODE_ENV === "production" && !env.EMAIL_OUTBOX_FILE) {
    console.warn(
      "[e-posta] RESEND_API_KEY ayarlanmamış; e-posta sadece loga yazılıyor.",
    );
  }
  console.info(
    [
      "",
      "──────── E-posta ────────",
      `Kime: ${email.to}`,
      `Konu: ${email.subject}`,
      "",
      email.text,
      "─────────────────────────",
      "",
    ].join("\n"),
  );
}
