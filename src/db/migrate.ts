import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { parseEnv } from "@/env";

// drizzle/ klasöründeki henüz uygulanmamış migration'ları sırayla çalıştırır.
// Hangilerinin uygulandığı veritabanındaki drizzle.__drizzle_migrations
// tablosunda tutulur; bu yüzden komutu tekrar çalıştırmak güvenlidir.
const env = parseEnv(process.env);
const client = postgres(env.DATABASE_URL, { max: 1 });

async function main() {
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  console.log("Migration'lar uygulandı.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
