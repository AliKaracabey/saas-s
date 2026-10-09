ALTER TYPE "public"."subscription_status" ADD VALUE 'incomplete_expired';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'unpaid';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'paused';--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
