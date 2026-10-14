CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint

CREATE TYPE "public"."ceremony_kind" AS ENUM('TRADITIONAL', 'COURT', 'RELIGIOUS', 'RECEPTION');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('DRAFT', 'PENDING_PAYMENT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."guest_side" AS ENUM('GROOM', 'BRIDE');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ceremonies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" "ceremony_kind" NOT NULL,
	"venue_name" text NOT NULL,
	"address" text,
	"maps_url" text,
	"starts_at" timestamp with time zone NOT NULL,
	"dress_code" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"status" "event_status" DEFAULT 'DRAFT' NOT NULL,
	"slug" text,
	"timezone" text DEFAULT 'Africa/Lagos' NOT NULL,
	"monogram" text NOT NULL,
	"groom_seq" integer DEFAULT 0 NOT NULL,
	"bride_seq" integer DEFAULT 0 NOT NULL,
	"guest_cap" integer NOT NULL,
	"tier" text NOT NULL,
	"theme" jsonb,
	"hero_image_url" text,
	"groom_signature_url" text,
	"bride_signature_url" text,
	"story" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"side" "guest_side" NOT NULL,
	"seq" integer NOT NULL,
	"guest_code" text NOT NULL,
	"public_token" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" "citext",
	"phone" text,
	"dietary" text,
	"pass_image_url" text,
	"checked_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ceremonies" ADD CONSTRAINT "ceremonies_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_owner_id_accounts_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ceremonies_event_idx" ON "ceremonies" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_unique" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_event_side_seq_unique" ON "guests" USING btree ("event_id","side","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_guest_code_unique" ON "guests" USING btree ("event_id","guest_code");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_public_token_unique" ON "guests" USING btree ("public_token");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_ref_unique" ON "payments" USING btree ("provider_ref");