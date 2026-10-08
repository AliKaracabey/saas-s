import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("Türkçe karakterleri ve boşlukları dönüştürür", () => {
    expect(slugify("Ali'nin Şirketi")).toBe("alinin-sirketi");
    expect(slugify("  Çiğ Köfte & Ürün  ")).toBe("cig-kofte-urun");
    expect(slugify("İSTANBUL Ofisi")).toBe("istanbul-ofisi");
  });

  it("anlamlı karakter yoksa varsayılan bir ad verir", () => {
    expect(slugify("!!!")).toBe("ekip");
  });

  it("uzun adları kısaltır, sonda tire bırakmaz", () => {
    const slug = slugify("a ".repeat(100));
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-")).toBe(false);
  });
});
