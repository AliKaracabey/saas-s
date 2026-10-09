import "server-only";
import { appendFile } from "node:fs/promises";
import { env } from "@/server-env";

export type Email = { to: string; subject: string; text: string };

/*
 * Şimdilik e-postalar gönderilmez, sunucu konsoluna yazılır. Geliştirirken
 * doğrulama ve sıfırlama linklerini terminalden kopyalayabilirsin. Canlıya
 * alırken (adım 1.7) burası gerçek bir e-posta servisine bağlanacak.
 *
 * EMAIL_OUTBOX_FILE verilmişse e-posta o dosyaya da eklenir. Uçtan uca
 * testler (e2e/) bir kullanıcının e-postasına gelen linki oradan okur;
 * gerçek bir kullanıcının gelen kutusuna bakmanın test versiyonu.
 */
export async function sendEmail(email: Email): Promise<void> {
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

  if (env.EMAIL_OUTBOX_FILE) {
    await appendFile(env.EMAIL_OUTBOX_FILE, JSON.stringify(email) + "\n");
  }
}
