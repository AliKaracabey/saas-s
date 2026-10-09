import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { prepareDatabase } from "../src/test/db-setup";
import { E2E_DATABASE_URL, OUTBOX_FILE } from "./env";

/*
 * Testlerden önce bir kez çalışır: e2e veritabanını hazırlar, önceki
 * çalıştırmadan kalan veriyi ve e-postaları siler. Testler yine de her
 * seferinde benzersiz e-posta adresleri kullanır; böylece paralel çalışan
 * testler birbirinin verisine karışmaz.
 */
export default async function globalSetup() {
  await prepareDatabase(E2E_DATABASE_URL);
  const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
  await sql`truncate users, organizations, stripe_events cascade`;
  await sql.end();

  await mkdir(path.dirname(OUTBOX_FILE), { recursive: true });
  await rm(OUTBOX_FILE, { force: true });
}
