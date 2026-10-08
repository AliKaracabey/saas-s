import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { sessions, users, verificationTokens } from "@/db/schema";
import {
  authenticate,
  createPasswordReset,
  createVerificationToken,
  loginWithOAuth,
  registerUser,
  resetPassword,
  verifyEmail,
} from "./account";
import {
  SESSION_LIFETIME_MS,
  createSession,
  validateSessionToken,
} from "./session";

const DAY = 24 * 60 * 60 * 1000;
const ali = { name: "Ali", email: "ali@ornek.com", password: "cok-gizli-1" };

async function registerAli() {
  const result = await registerUser(ali);
  if (!result.ok) throw new Error("kayıt başarısız");
  return result.user;
}

beforeEach(async () => {
  await db.execute(sql`truncate users, organizations cascade`);
});

afterAll(async () => {
  await db.$client.end();
});

describe("kayıt ve giriş", () => {
  it("kullanıcıyı kaydeder, şifreyi özetleyerek saklar", async () => {
    const user = await registerAli();
    expect(user.passwordHash).not.toBe(ali.password);
    expect(user.emailVerifiedAt).toBeNull();
  });

  it("aynı e-postayla ikinci kaydı reddeder", async () => {
    await registerAli();
    expect(await registerUser({ ...ali, email: "ALI@ornek.com" })).toEqual({
      ok: false,
      error: "email_taken",
    });
  });

  it("doğru bilgilerle girişe izin verir", async () => {
    const user = await registerAli();
    expect((await authenticate("Ali@Ornek.com", ali.password))?.id).toBe(
      user.id,
    );
  });

  it("yanlış şifreyi ve kayıtlı olmayan e-postayı reddeder", async () => {
    await registerAli();
    expect(await authenticate(ali.email, "yanlis-sifre")).toBeNull();
    expect(await authenticate("yok@ornek.com", ali.password)).toBeNull();
  });
});

describe("oturumlar", () => {
  it("token ile oturumu ve kullanıcıyı bulur", async () => {
    const user = await registerAli();
    const { token } = await createSession(user.id);

    const result = await validateSessionToken(token);
    expect(result.user?.id).toBe(user.id);
  });

  it("veritabanında token'ın kendisini değil özetini saklar", async () => {
    const user = await registerAli();
    const { token } = await createSession(user.id);

    const [row] = await db.select().from(sessions);
    expect(row?.id).not.toBe(token);
  });

  it("bilinmeyen token'ı reddeder", async () => {
    expect((await validateSessionToken("uydurma")).session).toBeNull();
  });

  it("süresi dolan oturumu reddeder ve siler", async () => {
    const user = await registerAli();
    const { token, session } = await createSession(user.id);
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.id, session.id));

    expect((await validateSessionToken(token)).session).toBeNull();
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it("süresinin yarısından azı kalan oturumu 30 güne uzatır", async () => {
    const user = await registerAli();
    const { token, session } = await createSession(user.id);
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + 10 * DAY) })
      .where(eq(sessions.id, session.id));

    const result = await validateSessionToken(token);
    const remaining = result.session!.expiresAt.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(SESSION_LIFETIME_MS - 60_000);
  });
});

describe("e-posta doğrulama", () => {
  it("geçerli token ile e-postayı doğrular, token bir kez kullanılabilir", async () => {
    const user = await registerAli();
    const token = await createVerificationToken(user.id, "email_verification");

    expect(await verifyEmail(token)).toBe(true);
    expect(await verifyEmail(token)).toBe(false);

    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row?.emailVerifiedAt).not.toBeNull();
  });

  it("yeni link gönderilince eskisi geçersiz olur", async () => {
    const user = await registerAli();
    const old = await createVerificationToken(user.id, "email_verification");
    const latest = await createVerificationToken(user.id, "email_verification");

    expect(await verifyEmail(old)).toBe(false);
    expect(await verifyEmail(latest)).toBe(true);
  });

  it("süresi dolan token'ı reddeder", async () => {
    const user = await registerAli();
    const token = await createVerificationToken(user.id, "email_verification");
    await db
      .update(verificationTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) });

    expect(await verifyEmail(token)).toBe(false);
  });

  it("şifre sıfırlama token'ı e-posta doğrulamada kullanılamaz", async () => {
    const user = await registerAli();
    const token = await createVerificationToken(user.id, "password_reset");
    expect(await verifyEmail(token)).toBe(false);
  });
});

describe("şifre sıfırlama", () => {
  it("kayıtlı olmayan e-posta için token üretmez", async () => {
    expect(await createPasswordReset("yok@ornek.com")).toBeNull();
  });

  it("şifreyi değiştirir ve tüm açık oturumları kapatır", async () => {
    const user = await registerAli();
    const { token: sessionToken } = await createSession(user.id);
    const reset = await createPasswordReset(ali.email);

    expect(await resetPassword(reset!.token, "yepyeni-sifre")).toBe(user.id);

    expect(await authenticate(ali.email, ali.password)).toBeNull();
    expect(await authenticate(ali.email, "yepyeni-sifre")).not.toBeNull();
    expect((await validateSessionToken(sessionToken)).session).toBeNull();
  });

  it("aynı link ikinci kez kullanılamaz", async () => {
    await registerAli();
    const reset = await createPasswordReset(ali.email);

    expect(await resetPassword(reset!.token, "yepyeni-sifre")).not.toBeNull();
    expect(await resetPassword(reset!.token, "baska-sifre")).toBeNull();
  });
});

describe("GitHub ile giriş", () => {
  const github = {
    provider: "github" as const,
    providerAccountId: "12345",
    name: "Ali GitHub",
    verifiedEmail: "ali@ornek.com",
  };

  it("yeni kişi için doğrulanmış, şifresiz bir kullanıcı oluşturur", async () => {
    const result = await loginWithOAuth(github);
    expect(result.ok && result.created).toBe(true);
    if (!result.ok) return;
    expect(result.user.passwordHash).toBeNull();
    expect(result.user.emailVerifiedAt).not.toBeNull();
  });

  it("aynı GitHub hesabıyla ikinci girişte aynı kullanıcıyı bulur", async () => {
    const first = await loginWithOAuth(github);
    // GitHub'daki e-posta sonradan değişse bile hesap numarasından bulunur.
    const second = await loginWithOAuth({
      ...github,
      verifiedEmail: "yeni@ornek.com",
    });
    expect(second.ok && first.ok && second.user.id === first.user.id).toBe(
      true,
    );
  });

  it("aynı e-postalı mevcut hesaba bağlanır ve e-postayı doğrular", async () => {
    const user = await registerAli();
    const result = await loginWithOAuth(github);

    expect(result.ok && result.user.id).toBe(user.id);
    expect(result.ok && result.created).toBe(false);
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row?.emailVerifiedAt).not.toBeNull();
    // Şifresi de çalışmaya devam eder.
    expect(await authenticate(ali.email, ali.password)).not.toBeNull();
  });

  it("GitHub e-postası doğrulanmamışsa giriş yapmaz", async () => {
    expect(await loginWithOAuth({ ...github, verifiedEmail: null })).toEqual({
      ok: false,
      error: "email_required",
    });
  });

  it("hesaba başka bir GitHub hesabı bağlıysa ikincisini bağlamaz", async () => {
    await loginWithOAuth(github);
    expect(
      await loginWithOAuth({ ...github, providerAccountId: "99999" }),
    ).toEqual({ ok: false, error: "account_conflict" });
  });
});
