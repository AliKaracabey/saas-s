const turkish: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

/** "Ali'nin Şirketi" → "alinin-sirketi" */
export function slugify(name: string): string {
  return (
    name
      .toLocaleLowerCase("tr-TR")
      // Kesme işareti kelimeyi bölmesin: "Ali'nin" → "alinin"
      .replace(/['’]/g, "")
      .replace(/[çğıöşü]/g, (c) => turkish[c] ?? c)
      // Diğer aksanlı harfler: "é" → "e"
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/, "") || "ekip"
  );
}
