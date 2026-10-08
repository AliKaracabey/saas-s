import { describe, expect, it } from "vitest";
import { pickVerifiedEmail } from "./github";

describe("pickVerifiedEmail", () => {
  it("doğrulanmış birincil e-postayı seçer", () => {
    expect(
      pickVerifiedEmail([
        { email: "is@ornek.com", primary: false, verified: true },
        { email: "Ali@Ornek.com", primary: true, verified: true },
      ]),
    ).toBe("ali@ornek.com");
  });

  it("birincil e-posta doğrulanmamışsa hiçbirini kabul etmez", () => {
    expect(
      pickVerifiedEmail([
        { email: "ali@ornek.com", primary: true, verified: false },
        { email: "is@ornek.com", primary: false, verified: true },
      ]),
    ).toBeNull();
  });
});
