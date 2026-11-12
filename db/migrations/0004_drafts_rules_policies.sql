CREATE TYPE "public"."draft_action" AS ENUM('appeal', 'corrected_claim');--> statement-breakpoint
CREATE TYPE "public"."rules_outcome" AS ENUM('pass', 'warn', 'fail');--> statement-breakpoint
ALTER TYPE "public"."job_kind" ADD VALUE 'draft_denial';--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"denial_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"action" "draft_action" NOT NULL,
	"content" jsonb NOT NULL,
	"biller_facts" jsonb NOT NULL,
	"model_name" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cost_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ncci_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"column_one_code" text NOT NULL,
	"column_two_code" text NOT NULL,
	"modifier_allowed" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payer_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"payer_id" uuid NOT NULL,
	"policy_id" text NOT NULL,
	"denial_code" text NOT NULL,
	"topic" text NOT NULL,
	"policy_text" text NOT NULL,
	"source_url" text NOT NULL,
	"effective_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"overall" "rules_outcome" NOT NULL,
	"checks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rules_checks_draft_id_unique" UNIQUE("draft_id")
);
--> statement-breakpoint
ALTER TABLE "denials" ADD COLUMN "biller_facts" jsonb;--> statement-breakpoint
ALTER TABLE "denials" ADD COLUMN "draft_action" "draft_action";--> statement-breakpoint
ALTER TABLE "denials" ADD COLUMN "draft_failure_message" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "denial_id" uuid;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_denial_id_denials_id_fk" FOREIGN KEY ("denial_id") REFERENCES "public"."denials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payer_policies" ADD CONSTRAINT "payer_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payer_policies" ADD CONSTRAINT "payer_policies_payer_id_payers_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."payers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules_checks" ADD CONSTRAINT "rules_checks_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drafts_denial_version_unique" ON "drafts" USING btree ("denial_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "ncci_edits_pair_unique" ON "ncci_edits" USING btree ("column_one_code","column_two_code");--> statement-breakpoint
CREATE UNIQUE INDEX "payer_policies_payer_policy_date_unique" ON "payer_policies" USING btree ("payer_id","policy_id","effective_date");--> statement-breakpoint
CREATE INDEX "payer_policies_payer_code" ON "payer_policies" USING btree ("payer_id","denial_code");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_denial_id_denials_id_fk" FOREIGN KEY ("denial_id") REFERENCES "public"."denials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_one_open_draft_per_denial" ON "jobs" USING btree ("denial_id") WHERE "jobs"."status" IN ('queued', 'running');