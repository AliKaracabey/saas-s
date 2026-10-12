import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const valid = {
  NODE_ENV: "development",
  DATABASE_URL: "postgres://saas:saas@localhost:5432/saas",
  APP_URL: "http://localhost:3000",
  SESSION_SECRET: "a".repeat(32),
};

describe("parseEnv", () => {
  it("geçerli bir ortamı kabul eder", () => {
    const env = parseEnv(valid);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.SESSION_SECRET).toBe(valid.SESSION_SECRET);
  });

  describe("NODE_ENV", () => {
    it("verilmezse development olur", () => {
      const { NODE_ENV: _, ...rest } = valid;
      expect(parseEnv(rest).NODE_ENV).toBe("development");
    });

    it("sadece development, test veya production olabilir", () => {
      expect(parseEnv({ ...valid, NODE_ENV: "test" }).NODE_ENV).toBe("test");
      expect(() => parseEnv({ ...valid, NODE_ENV: "staging" })).toThrow(
        /NODE_ENV/,
      );
    });
  });

  describe("DATABASE_URL", () => {
    it("zorunludur", () => {
      const { DATABASE_URL: _, ...rest } = valid;
      expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
    });

    it("postgres:// veya postgresql:// ile başlamalıdır", () => {
      expect(
        parseEnv({ ...valid, DATABASE_URL: "postgresql://u:p@db:5432/x" })
          .DATABASE_URL,
      ).toBe("postgresql://u:p@db:5432/x");
      expect(() =>
        parseEnv({ ...valid, DATABASE_URL: "mysql://u:p@db:3306/x" }),
      ).toThrow(/DATABASE_URL/);
    });
  });

  describe("APP_URL", () => {
    it("geçerli bir URL olmalıdır", () => {
      expect(() => parseEnv({ ...valid, APP_URL: "localhost" })).toThrow(
        /APP_URL/,
      );
    });

    it("sondaki eğik çizgiyi siler", () => {
      expect(
        parseEnv({ ...valid, APP_URL: "https://ornek.com/" }).APP_URL,
      ).toBe("https://ornek.com");
    });
  });

  describe("SESSION_SECRET", () => {
    it("en az 32 karakter olmalıdır", () => {
      expect(() =>
        parseEnv({ ...valid, SESSION_SECRET: "a".repeat(31) }),
      ).toThrow(/SESSION_SECRET/);
    });

    it("hata mesajında gizli değeri asla göstermez", () => {
      const secret = "cok-gizli-kisa";
      expect(() => parseEnv({ ...valid, SESSION_SECRET: secret })).toThrow(
        expect.objectContaining({
          message: expect.not.stringContaining(secret),
        }),
      );
    });
  });

  describe("PORT", () => {
    it("verilmezse 3000 olur", () => {
      expect(parseEnv(valid).PORT).toBe(3000);
    });

    it("metni sayıya çevirir", () => {
      expect(parseEnv({ ...valid, PORT: "8080" }).PORT).toBe(8080);
    });

    it("1 ile 65535 arasında bir tam sayı olmalıdır", () => {
      for (const PORT of ["0", "70000", "3.5", "abc"]) {
        expect(() => parseEnv({ ...valid, PORT })).toThrow(/PORT/);
      }
    });
  });

  it("birden fazla hata varsa hepsini tek seferde bildirir", () => {
    let message = "";
    try {
      parseEnv({ NODE_ENV: "development" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/DATABASE_URL/);
    expect(message).toMatch(/APP_URL/);
    expect(message).toMatch(/SESSION_SECRET/);
  });

  describe("GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET", () => {
    it("isteğe bağlıdır; boş bırakılırsa verilmemiş sayılır", () => {
      const env = parseEnv({
        ...valid,
        GITHUB_CLIENT_ID: "",
        GITHUB_CLIENT_SECRET: "",
      });
      expect(env.GITHUB_CLIENT_ID).toBeUndefined();
    });

    it("ikisi birlikte verilmelidir", () => {
      expect(() => parseEnv({ ...valid, GITHUB_CLIENT_ID: "id" })).toThrow(
        /GITHUB_CLIENT_ID/,
      );
      expect(
        parseEnv({
          ...valid,
          GITHUB_CLIENT_ID: "id",
          GITHUB_CLIENT_SECRET: "s",
        }).GITHUB_CLIENT_ID,
      ).toBe("id");
    });
  });

  describe("STRIPE_*", () => {
    const stripe = {
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      STRIPE_PRICE_PRO: "price_123",
    };

    it("üçü birlikte verilince kabul edilir", () => {
      expect(parseEnv({ ...valid, ...stripe }).STRIPE_PRICE_PRO).toBe(
        "price_123",
      );
    });

    it("eksik verilirse reddedilir", () => {
      expect(() =>
        parseEnv({ ...valid, STRIPE_SECRET_KEY: stripe.STRIPE_SECRET_KEY }),
      ).toThrow(/STRIPE_SECRET_KEY/);
    });

    it("yanlış türde anahtarı reddeder", () => {
      expect(() =>
        parseEnv({ ...valid, ...stripe, STRIPE_SECRET_KEY: "pk_test_123" }),
      ).toThrow(/STRIPE_SECRET_KEY/);
    });
  });

  describe("RESEND_API_KEY ve EMAIL_FROM", () => {
    it("ikisi birlikte verilince kabul edilir", () => {
      const env = parseEnv({
        ...valid,
        RESEND_API_KEY: "re_123",
        EMAIL_FROM: "saas-s <bildirim@ornek.com>",
      });
      expect(env.RESEND_API_KEY).toBe("re_123");
    });

    it("biri eksikse reddedilir", () => {
      expect(() => parseEnv({ ...valid, RESEND_API_KEY: "re_123" })).toThrow(
        /RESEND_API_KEY/,
      );
    });
  });

  describe("APP_URL canlıda", () => {
    const production = { ...valid, NODE_ENV: "production" };

    it("https adresini kabul eder", () => {
      expect(
        parseEnv({ ...production, APP_URL: "https://saas-s.vercel.app" })
          .APP_URL,
      ).toBe("https://saas-s.vercel.app");
    });

    it("http adresini reddeder", () => {
      expect(() =>
        parseEnv({ ...production, APP_URL: "http://saas-s.vercel.app" }),
      ).toThrow(/APP_URL/);
    });

    it("localhost'a izin verir", () => {
      expect(() =>
        parseEnv({ ...production, APP_URL: "http://localhost:3100" }),
      ).not.toThrow();
    });
  });
});
