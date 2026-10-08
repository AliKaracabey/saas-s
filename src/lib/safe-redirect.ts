/**
 * Giriş sonrası dönülecek adresi doğrular. Sadece kendi sitemizdeki yollara
 * ("/davet?token=...") izin verir.
 *
 * Kontrol etmeseydik "/giris?sonra=https://kotu-site.com" gibi bir link,
 * kullanıcıyı giriş yaptıktan sonra saldırganın sitesine götürürdü (open
 * redirect). "//kotu-site.com" da tarayıcı için başka bir sitedir.
 */
export function safeRedirectPath(value: unknown, fallback = "/panel"): string {
  if (typeof value !== "string") return fallback;
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }
  return value;
}
