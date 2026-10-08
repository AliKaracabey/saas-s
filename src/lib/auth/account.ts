import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import {
  oauthAccounts,
  users,
  verificationTokens,
  type TokenPurpose,
  type User,
} from "@/db/schema";
import { env } from "@/server-env";
import { hashPassword, verifyDummyPassword, verifyPassword } from "./password";
import { invalidateUserSessions } from "./session";
import { generateToken, hashToken } from "./tokens";

/*
 * Hesapla ilgili iş kuralları. Çerez, form ve yönlendirme gibi web'e özgü
 * şeyler burada yok (onlar actions.ts içinde); bu sayede bu fonksiyonlar
 * doğrudan test edilebilir.
 */

const HOUR = 60 * 60 * 1000;
const TOKEN_LIFETIME_MS: Record<TokenPurpose, number> = {
  email_verification: 24 * HOUR,
  // Şifre sıfırlama linki daha hassastır, ömrü kısa tutulur.
  password_reset: 1 * HOUR,
};

function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: (u) => eq(sql`lower(${u.email})`, email.toLowerCase()),
  });
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: true; user: User } | { ok: false; error: "email_taken" }> {
  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await db
      .insert(users)
      .values({ name: input.name, email: input.email, passwordHash })
      .returning();
    return { ok: true, user: user! };
  } catch (error) {
    // Önce "bu e-posta var mı?" diye sorup sonra eklemek, aynı anda gelen iki
    // istekte ikisinin de kontrolü geçmesine yol açar. Bunun yerine eklemeyi
    // deneyip veritabanının unique kısıtına güveniyoruz.
    if (isUniqueViolation(error)) return { ok: false, error: "email_taken" };
    throw error;
  }
}

/** E-posta ve şifre doğruysa kullanıcıyı, değilse null döndürür. */
export async function authenticate(
  email: string,
  password: string,
): Promise<User | null> {
  const user = await findUserByEmail(email);

  if (!user?.passwordHash) {
    // Kullanıcı yokken de aynı süre beklenir; aksi halde cevabın hızından
    // hangi e-postaların kayıtlı olduğu anlaşılabilir.
    await verifyDummyPassword(password);
    return null;
  }

  return (await verifyPassword(user.passwordHash, password)) ? user : null;
}

export async function createVerificationToken(
  userId: string,
  purpose: TokenPurpose,
): Promise<string> {
  const token = generateToken();
  await db.transaction(async (tx) => {
    // Aynı amaçla gönderilmiş eski linkler geçersiz olur; sadece en son
    // gönderilen çalışır.
    await tx
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.userId, userId),
          eq(verificationTokens.purpose, purpose),
        ),
      );
    await tx.insert(verificationTokens).values({
      tokenHash: hashToken(token, env.SESSION_SECRET),
      userId,
      purpose,
      expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS[purpose]),
    });
  });
  return token;
}

/**
 * Token'ı tek seferlik olarak kullanır: geçerliyse siler ve sahibinin
 * id'sini döndürür. Silme ve kontrol tek sorguda yapılır; aynı link aynı anda
 * iki kez açılsa bile sadece biri başarılı olur.
 */
async function consumeToken(
  token: string,
  purpose: TokenPurpose,
): Promise<string | null> {
  const [row] = await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, hashToken(token, env.SESSION_SECRET)),
        eq(verificationTokens.purpose, purpose),
        gt(verificationTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: verificationTokens.userId });
  return row?.userId ?? null;
}

export async function verifyEmail(token: string): Promise<boolean> {
  const userId = await consumeToken(token, "email_verification");
  if (!userId) return false;
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, userId));
  return true;
}

/**
 * Şifre sıfırlama linki için token üretir. Kayıtlı olmayan e-postada null
 * döner; arayan taraf yine de kullanıcıya aynı mesajı göstermelidir.
 */
export async function createPasswordReset(
  email: string,
): Promise<{ user: User; token: string } | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  return {
    user,
    token: await createVerificationToken(user.id, "password_reset"),
  };
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<string | null> {
  const userId = await consumeToken(token, "password_reset");
  if (!userId) return null;

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(newPassword),
      // Linke tıklayabildiğine göre e-posta adresinin sahibidir.
      emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
    })
    .where(eq(users.id, userId));

  // Şifresi çalındığı için sıfırlayan biri, saldırganın açık oturumlarının da
  // kapanmasını bekler.
  await invalidateUserSessions(userId);
  return userId;
}

export type OAuthProfile = {
  provider: "github";
  providerAccountId: string;
  name: string;
  verifiedEmail: string | null;
};

export type OAuthLoginResult =
  | { ok: true; user: User; created: boolean }
  | { ok: false; error: "email_required" | "account_conflict" };

/**
 * GitHub ile giriş yapan kişiyi bir kullanıcıya eşler:
 * 1. Bu GitHub hesabı daha önce bağlandıysa o kullanıcı.
 * 2. Aynı e-postayla kayıtlı bir kullanıcı varsa, GitHub hesabı ona bağlanır.
 *    Bunu sadece GitHub e-postayı doğruladıysa yaparız; aksi halde biri
 *    başkasının e-postasını GitHub'a ekleyip onun hesabına girebilirdi.
 * 3. Hiçbiri yoksa yeni bir kullanıcı oluşturulur (şifresiz).
 */
export async function loginWithOAuth(
  profile: OAuthProfile,
): Promise<OAuthLoginResult> {
  return db.transaction(async (tx) => {
    const [linked] = await tx
      .select({ user: users })
      .from(oauthAccounts)
      .innerJoin(users, eq(users.id, oauthAccounts.userId))
      .where(
        and(
          eq(oauthAccounts.provider, profile.provider),
          eq(oauthAccounts.providerAccountId, profile.providerAccountId),
        ),
      );
    if (linked) return { ok: true, user: linked.user, created: false };

    if (!profile.verifiedEmail) return { ok: false, error: "email_required" };

    const existing = await tx.query.users.findFirst({
      where: (u) =>
        eq(sql`lower(${u.email})`, profile.verifiedEmail!.toLowerCase()),
    });

    if (existing) {
      // Bu kullanıcıya başka bir GitHub hesabı zaten bağlı.
      const other = await tx.query.oauthAccounts.findFirst({
        where: (a) =>
          and(eq(a.userId, existing.id), eq(a.provider, profile.provider)),
      });
      if (other) return { ok: false, error: "account_conflict" };
    }

    const user =
      existing ??
      (
        await tx
          .insert(users)
          .values({
            name: profile.name,
            email: profile.verifiedEmail,
            emailVerifiedAt: new Date(),
          })
          .returning()
      )[0]!;

    if (existing && !existing.emailVerifiedAt) {
      // GitHub bu adresin sahibi olduğunu doğruladı.
      await tx
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, existing.id));
    }

    await tx.insert(oauthAccounts).values({
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      userId: user.id,
    });

    return { ok: true, user, created: !existing };
  });
}
