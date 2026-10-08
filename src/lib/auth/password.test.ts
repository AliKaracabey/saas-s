import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("şifre özetleme", () => {
  it("şifreyi düz metin olarak saklamaz", async () => {
    const hash = await hashPassword("cok-gizli-sifre");
    expect(hash).not.toContain("cok-gizli-sifre");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("aynı şifre için her seferinde farklı özet üretir (salt)", async () => {
    expect(await hashPassword("ayni-sifre")).not.toBe(
      await hashPassword("ayni-sifre"),
    );
  });

  it("doğru şifreyi kabul eder, yanlışını reddeder", async () => {
    const hash = await hashPassword("dogru-sifre");
    expect(await verifyPassword(hash, "dogru-sifre")).toBe(true);
    expect(await verifyPassword(hash, "yanlis-sifre")).toBe(false);
  });

  it("bozuk bir özette hata fırlatmak yerine false döner", async () => {
    expect(await verifyPassword("bozuk", "sifre")).toBe(false);
  });
});
