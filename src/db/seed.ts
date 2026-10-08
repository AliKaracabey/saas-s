import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { parseEnv } from "@/env";
import * as schema from "./schema";

// Geliştirme için örnek veri. Tekrar çalıştırılabilir: var olan kayıtları
// atlar (onConflictDoNothing).
const env = parseEnv(process.env);
const client = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.users)
      .values([
        { email: "ali@ornek.com", name: "Ali", emailVerifiedAt: new Date() },
        { email: "ayse@ornek.com", name: "Ayşe", emailVerifiedAt: new Date() },
      ])
      .onConflictDoNothing();

    await tx
      .insert(schema.organizations)
      .values({ name: "Demo Şirket", slug: "demo-sirket" })
      .onConflictDoNothing();

    const ali = await tx.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "ali@ornek.com"),
    });
    const ayse = await tx.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "ayse@ornek.com"),
    });
    const org = await tx.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.slug, "demo-sirket"),
    });
    if (!ali || !ayse || !org) throw new Error("Örnek kayıtlar bulunamadı");

    await tx
      .insert(schema.memberships)
      .values([
        { userId: ali.id, organizationId: org.id, role: "owner" },
        { userId: ayse.id, organizationId: org.id, role: "member" },
      ])
      .onConflictDoNothing();

    await tx
      .insert(schema.subscriptions)
      .values({ organizationId: org.id, plan: "free" })
      .onConflictDoNothing();
  });
  console.log(
    "Örnek veriler eklendi: ali@ornek.com, ayse@ornek.com, Demo Şirket",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
