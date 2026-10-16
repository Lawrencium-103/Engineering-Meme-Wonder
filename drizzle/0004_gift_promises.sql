CREATE TABLE "gift_promises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_promises" ADD CONSTRAINT "gift_promises_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_promises" ADD CONSTRAINT "gift_promises_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gift_promises_guest_unique" ON "gift_promises" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "gift_promises_event_idx" ON "gift_promises" USING btree ("event_id");