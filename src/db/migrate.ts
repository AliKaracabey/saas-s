import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { parseEnv } from "@/env";

// drizzle/ klasöründeki henüz uygulanmamış migration'ları sırayla çalıştırır.
// Hangilerinin uygulandığı veritabanındaki drizzle.__drizzle_migrations
// tablosunda tutulur; bu yüzden komutu tekrar çalıştırmak güvenlidir.
const env = parseEnv(process.env);
const client = postgres(env.DATABASE_URL, { max: 1, onnotice: () => {} });

async function main() {
  // Vercel her pull request için bir "preview" sürümü derler. Migration'ı
  // orada da çalıştırırsak, henüz merge edilmemiş bir PR canlı veritabanının
  // şemasını değiştirir. Bu yüzden Vercel'de sadece production derlemesinde
  // çalıştırıyoruz. (VERCEL_ENV Vercel dışında tanımlı değil; kendi
  // bilgisayarında `npm run db:migrate` her zaman çalışır.)
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") {
    console.log(`Migration atlandı (VERCEL_ENV=${vercelEnv}).`);
    return;
  }
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  console.log("Migration'lar uygulandı.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
