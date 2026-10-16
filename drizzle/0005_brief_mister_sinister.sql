CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"seq" integer NOT NULL,
	"name" text NOT NULL,
	"email" "citext" NOT NULL,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "referred_by_agent_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "agents_code_unique" ON "agents" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_seq_unique" ON "agents" USING btree ("seq");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_referred_by_agent_id_agents_id_fk" FOREIGN KEY ("referred_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;