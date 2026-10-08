import "server-only";

export type Email = { to: string; subject: string; text: string };

/*
 * Şimdilik e-postalar gönderilmez, sunucu konsoluna yazılır. Geliştirirken
 * doğrulama ve sıfırlama linklerini terminalden kopyalayabilirsin. Canlıya
 * alırken (adım 1.7) burası gerçek bir e-posta servisine bağlanacak.
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
}
