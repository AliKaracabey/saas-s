import { describe, expect, it } from "vitest";
import { resetPasswordSchema, signUpSchema } from "./validation";

describe("signUpSchema", () => {
  it("e-postayı küçük harfe çevirir ve boşlukları siler", () => {
    const result = signUpSchema.parse({
      name: "  Ali ",
      email: "  Ali@Ornek.COM ",
      password: "12345678",
    });
    expect(result).toEqual({
      name: "Ali",
      email: "ali@ornek.com",
      password: "12345678",
    });
  });

  it("kısa şifreyi reddeder", () => {
    const result = signUpSchema.safeParse({
      name: "Ali",
      email: "ali@ornek.com",
      password: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("geçersiz e-postayı reddeder", () => {
    const result = signUpSchema.safeParse({
      name: "Ali",
      email: "ali",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("şifreler eşleşmezse reddeder", () => {
    const result = resetPasswordSchema.safeParse({
      token: "t",
      password: "12345678",
      passwordConfirm: "87654321",
    });
    expect(result.success).toBe(false);
  });
});
