import { timingSafeEqual } from "node:crypto";
import { cleanupExpiredData } from "@/lib/maintenance";
import { env } from "@/server-env";

/*
 * Günlük temizlik: GET /api/cron/temizlik
 *
 * vercel.json'daki "crons" ayarı sayesinde Vercel bu adresi her gün çağırır
 * ve isteğe `Authorization: Bearer <CRON_SECRET>` başlığını ekler. Başlık
 * tutmazsa 401 döneriz; yoksa herkes bu adresi çağırıp veritabanını
 * yorabilirdi.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!env.CRON_SECRET) return new Response(null, { status: 404 });

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response(null, { status: 401 });
  }

  const deleted = await cleanupExpiredData();
  console.info("[temizlik]", deleted);
  return Response.json({ deleted });
}
