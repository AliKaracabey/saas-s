import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * Veritabanı şeması. Açıklama ve ER diyagramı:
 * docs/notlar/1.2-veritabani-tasarimi.md
 *
 * Kurallar:
 * - Birincil anahtarlar UUID: tahmin edilemez, URL'de sıra numarası sızdırmaz.
 * - Zamanlar her zaman saat dilimli (timestamptz) tutulur.
 * - Bir kullanıcı veya organizasyon silinince ona bağlı satırlar da silinir
 *   (onDelete: "cascade"); yetim kayıt kalmaz.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const roleEnum = pgEnum("role", ["owner", "admin", "member"]);
export const planEnum = pgEnum("plan", ["free", "pro"]);
export const tokenPurposeEnum = pgEnum("token_purpose", [
  "email_verification",
  "password_reset",
]);
// Stripe'ın abonelik durumlarının birebir aynısı. Kendi tablomuzu Stripe'tan
// gelen veriyle senkron tuttuğumuz için durumları çevirmeden saklıyoruz.
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    // Sadece GitHub ile giriş yapan kullanıcıların şifresi olmaz.
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // "Ali@Mail.com" ve "ali@mail.com" aynı hesap sayılır.
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
  ],
);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // URL'de görünen kısa ad: /org/ali-yazilim
  slug: text("slug").notNull().unique(),
  ...timestamps,
});

// Kullanıcı ile organizasyon arasındaki çoka-çok ilişki. Rol de burada
// durur, çünkü aynı kişi bir organizasyonda owner, diğerinde member olabilir.
export const memberships = pgTable(
  "memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("member"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.organizationId] }),
    // "Bu organizasyonun üyeleri kim?" sorgusu için.
    index("memberships_organization_id_idx").on(t.organizationId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    // Çerezdeki token'ın SHA-256 özeti. Token'ın kendisi veritabanında
    // tutulmaz; veritabanı sızsa bile oturumlar çalınamaz (1.3'te).
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

// Kullanıcının GitHub gibi dış servislerdeki hesapları. Bir kullanıcının hem
// şifresi hem GitHub hesabı olabilir; ikisiyle de aynı hesaba girer.
export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    provider: text("provider").notNull(),
    // GitHub'daki kullanıcı numarası. Kullanıcı adı değişebilir, bu değişmez.
    providerAccountId: text("provider_account_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    // Bir kullanıcıya her servisten tek hesap bağlanabilir.
    uniqueIndex("oauth_accounts_user_provider_idx").on(t.userId, t.provider),
  ],
);

// E-posta doğrulama ve şifre sıfırlama linklerindeki tek kullanımlık token'lar.
// Kullanılınca silinir; süresi dolanlar geçersiz sayılır.
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: tokenPurposeEnum("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("verification_tokens_user_id_idx").on(t.userId, t.purpose)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role").notNull().default("member"),
    // Davet linkindeki token'ın özeti; oturumlarla aynı mantık.
    tokenHash: text("token_hash").notNull().unique(),
    invitedById: uuid("invited_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("invitations_organization_id_idx").on(t.organizationId),
    // Aynı kişiye aynı organizasyondan aynı anda tek açık davet.
    uniqueIndex("invitations_pending_unique_idx")
      .on(t.organizationId, sql`lower(${t.email})`)
      .where(sql`${t.acceptedAt} is null`),
  ],
);

// Abonelik organizasyona aittir, kullanıcıya değil: ekip birlikte öder.
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  ...timestamps,
});

// İşlenmiş Stripe webhook olayları. Stripe aynı olayı birden fazla kez
// gönderebilir; bu tablo her olayın sadece bir kez işlenmesini sağlar.
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type TokenPurpose = (typeof tokenPurposeEnum.enumValues)[number];
export type Plan = (typeof planEnum.enumValues)[number];
export type SubscriptionStatus =
  (typeof subscriptionStatusEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
