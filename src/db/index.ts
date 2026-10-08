import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/server-env";
import * as schema from "./schema";

// Geliştirme sırasında Next.js dosyaları her değişiklikte yeniden yükler.
// Bağlantıyı globalThis üzerinde saklamazsak her yüklemede yeni bir bağlantı
// havuzu açılır ve Postgres'in bağlantı sınırı kısa sürede dolar.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client = globalForDb.client ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
export { schema };
