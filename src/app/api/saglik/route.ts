import { sql } from "drizzle-orm";
import { db } from "@/db";

/*
 * Sağlık kontrolü: GET /api/saglik
 *
 * Uygulama ayakta ve veritabanına ulaşabiliyor mu? Uptime izleyicileri
 * (Proje 3'te kendimizinkini yazacağız) bu adresi düzenli olarak çağırır.
 * Hata ayrıntısını dışarı vermiyoruz, sadece loga yazıyoruz.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[saglik] veritabanına ulaşılamadı", error);
    return Response.json({ ok: false }, { status: 503 });
  }
}
