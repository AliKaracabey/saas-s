import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type Session, type User } from "@/db/schema";
import { env } from "@/server-env";
import { generateToken, hashToken } from "./tokens";

const DAY = 24 * 60 * 60 * 1000;
export const SESSION_LIFETIME_MS = 30 * DAY;
// Süresinin yarısından azı kalan oturum, kullanıldığında 30 güne uzatılır.
// Böylece aktif kullanıcı hiç çıkış yapmak zorunda kalmaz, ama 30 gün
// kullanılmayan oturum kendiliğinden düşer ("sliding expiration").
const RENEW_THRESHOLD_MS = SESSION_LIFETIME_MS / 2;

export type SessionValidationResult =
  { session: Session; user: User } | { session: null; user: null };

export async function createSession(
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; session: Session }> {
  const token = generateToken();
  const [session] = await db
    .insert(sessions)
    .values({
      id: hashToken(token, env.SESSION_SECRET),
      userId,
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent?.slice(0, 500) ?? null,
    })
    .returning();
  // Token'ın kendisi sadece burada, bir kez döner ve çereze yazılır.
  return { token, session: session! };
}

export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  const id = hashToken(token, env.SESSION_SECRET);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id));

  if (!row) return { session: null, user: null };

  const { session, user } = row;
  const now = Date.now();

  if (session.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return { session: null, user: null };
  }

  if (session.expiresAt.getTime() - now < RENEW_THRESHOLD_MS) {
    session.expiresAt = new Date(now + SESSION_LIFETIME_MS);
    await db
      .update(sessions)
      .set({ expiresAt: session.expiresAt })
      .where(eq(sessions.id, id));
  }

  return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/** Şifre değişince kullanıcının tüm cihazlardaki oturumları kapatılır. */
export async function invalidateUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
