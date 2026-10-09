import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/*
 * Veritabanı testleri geliştirme veritabanına dokunmaz; ayrı bir test
 * veritabanı kullanır. Testlerden önce bir kez çalışır: test veritabanı
 * yoksa oluşturur ve migration'ları uygular. Uçtan uca testler de
 * (e2e/global-setup.ts) kendi veritabanı için aynı fonksiyonu kullanır.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://saas:saas@localhost:5432/saas_test";

export default function setup() {
  return prepareDatabase(TEST_DATABASE_URL);
}

/** Veritabanı yoksa oluşturur ve migration'ları uygular. */
export async function prepareDatabase(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);

  // Var olmayan bir veritabanına bağlanamayız; önce sunucudaki varsayılan
  // "postgres" veritabanına bağlanıp test veritabanını oluştururuz.
  url.pathname = "/postgres";
  const admin = postgres(url.toString(), { max: 1, onnotice: () => {} });
  const exists =
    await admin`select 1 from pg_database where datname = ${dbName}`;
  if (exists.length === 0) await admin.unsafe(`create database "${dbName}"`);
  await admin.end();

  const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();
}
