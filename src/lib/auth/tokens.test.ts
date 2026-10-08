import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./tokens";

describe("generateToken", () => {
  it("URL'de güvenle kullanılabilen 43 karakterlik bir metin üretir", () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("her seferinde farklı bir token üretir", () => {
    const tokens = new Set(Array.from({ length: 1000 }, generateToken));
    expect(tokens.size).toBe(1000);
  });
});

describe("hashToken", () => {
  it("aynı girdi için hep aynı özeti verir", () => {
    expect(hashToken("abc", "gizli")).toBe(hashToken("abc", "gizli"));
  });

  it("gizli anahtar değişince özet de değişir", () => {
    expect(hashToken("abc", "gizli-1")).not.toBe(hashToken("abc", "gizli-2"));
  });

  it("token'ın kendisini içermez", () => {
    const token = generateToken();
    expect(hashToken(token, "gizli")).not.toContain(token);
  });
});
