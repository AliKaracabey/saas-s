import { describe, expect, it } from "vitest";
import { createCodeChallenge, generateCodeVerifier } from "./oauth";

describe("PKCE", () => {
  it("RFC 7636'daki örnek değerle aynı sonucu üretir", () => {
    expect(
      createCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("verifier 43-128 karakter arasında ve URL'de güvenli", () => {
    expect(generateCodeVerifier()).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  });
});
