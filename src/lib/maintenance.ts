import "server-only";
import { and, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  invitations,
  sessions,
  stripeEvents,
  verificationTokens,
} from "@/db/schema";

const STRIPE_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/*
 * Süresi dolmuş, artık hiçbir işe yaramayan kayıtları siler. Her gün bir
 * kez Vercel Cron tarafından çağrılır (vercel.json → /api/cron/temizlik).
 *
 * Bu kayıtlar zaten kullanılamıyor (her kontrol süreyi de kontrol ediyor);
 * silmenin amacı tabloların sonsuza kadar büyümemesi.
 *
 * Stripe olay kayıtlarını 30 gün tutuyoruz: Stripe bir olayı en fazla
 * 3 gün boyunca tekrar gönderir, 30 gün bol bol yeterli.
 */
export async function cleanupExpiredData(now = new Date()) {
  const [expiredSessions, expiredTokens, expiredInvitations, oldEvents] =
    await Promise.all([
      db
        .delete(sessions)
        .where(lt(sessions.expiresAt, now))
        .returning({ id: sessions.id }),
      db
        .delete(verificationTokens)
        .where(lt(verificationTokens.expiresAt, now))
        .returning({ id: verificationTokens.tokenHash }),
      db
        .delete(invitations)
        .where(
          and(lt(invitations.expiresAt, now), isNull(invitations.acceptedAt)),
        )
        .returning({ id: invitations.id }),
      db
        .delete(stripeEvents)
        .where(
          lt(
            stripeEvents.processedAt,
            new Date(now.getTime() - STRIPE_EVENT_RETENTION_MS),
          ),
        )
        .returning({ id: stripeEvents.id }),
    ]);

  return {
    sessions: expiredSessions.length,
    verificationTokens: expiredTokens.length,
    invitations: expiredInvitations.length,
    stripeEvents: oldEvents.length,
  };
}
