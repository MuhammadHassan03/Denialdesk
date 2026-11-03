CREATE TYPE "public"."audit_action" AS ENUM('login', 'logout', 'login_failed', 'upload', 'denial_created', 'opened', 'details_confirmed', 'deadline_changed', 'facts_saved', 'action_overridden', 'draft_requested', 'draft_created', 'rules_checked', 'draft_edited', 'draft_rejected', 'approved', 'written_off', 'reopened', 'exported', 'copied', 'submitted', 'outcome_matched');--> statement-breakpoint
CREATE TYPE "public"."audit_actor" AS ENUM('user', 'system');--> statement-breakpoint
CREATE TYPE "public"."denial_status" AS ENUM('needs_check', 'new', 'drafting', 'in_review', 'approved', 'submitted', 'paid', 'denied_again', 'written_off', 'manual');--> statement-breakpoint
CREATE TYPE "public"."job_kind" AS ENUM('process_remittance');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."priority_bucket" AS ENUM('overdue', 'due_within_7', 'due_within_30', 'due_later');--> statement-breakpoint
CREATE TYPE "public"."remittance_source" AS ENUM('835', 'EOB');--> statement-breakpoint
CREATE TYPE "public"."remittance_status" AS ENUM('queued', 'processing', 'done', 'done_with_warnings', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('biller');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"actor" "audit_actor" NOT NULL,
	"user_id" uuid,
	"denial_id" uuid,
	"remittance_id" uuid,
	"action" "audit_action" NOT NULL,
	"draft_version" integer,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "denials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"remittance_id" uuid NOT NULL,
	"payer_id" uuid NOT NULL,
	"patient_control_number" text NOT NULL,
	"payer_claim_control_number" text NOT NULL,
	"claim_status_code" text NOT NULL,
	"group_code" text NOT NULL,
	"carc_code" text NOT NULL,
	"rarc_codes" text[] NOT NULL,
	"service_line_ref" text NOT NULL,
	"procedure_code" text,
	"procedure_modifiers" text[] NOT NULL,
	"line_charge_cents" integer,
	"line_paid_cents" integer,
	"claim_charge_cents" integer NOT NULL,
	"claim_paid_cents" integer NOT NULL,
	"amount_at_stake_cents" integer NOT NULL,
	"service_date" date,
	"payment_date" date NOT NULL,
	"appeal_deadline" date NOT NULL,
	"deadline_is_estimate" boolean NOT NULL,
	"status" "denial_status" NOT NULL,
	"priority_bucket" "priority_bucket" NOT NULL,
	"rank_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "failed_login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "job_kind" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"remittance_id" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error_id" text,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"payer_identifier" text,
	"appeal_window_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address_line" text,
	"npi" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remittances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"source" "remittance_source" NOT NULL,
	"status" "remittance_status" DEFAULT 'queued' NOT NULL,
	"sha256" text NOT NULL,
	"original_filename" text NOT NULL,
	"storage_uri" text NOT NULL,
	"denial_count" integer,
	"result_summary" jsonb,
	"biller_message" text,
	"error_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_setup_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_setup_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"practice_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"role" "user_role" DEFAULT 'biller' NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_denial_id_denials_id_fk" FOREIGN KEY ("denial_id") REFERENCES "public"."denials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_remittance_id_remittances_id_fk" FOREIGN KEY ("remittance_id") REFERENCES "public"."remittances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "denials" ADD CONSTRAINT "denials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "denials" ADD CONSTRAINT "denials_remittance_id_remittances_id_fk" FOREIGN KEY ("remittance_id") REFERENCES "public"."remittances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "denials" ADD CONSTRAINT "denials_payer_id_payers_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."payers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_remittance_id_remittances_id_fk" FOREIGN KEY ("remittance_id") REFERENCES "public"."remittances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payers" ADD CONSTRAINT "payers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practices" ADD CONSTRAINT "practices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remittances" ADD CONSTRAINT "remittances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remittances" ADD CONSTRAINT "remittances_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_setup_tokens" ADD CONSTRAINT "user_setup_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_denial_created" ON "audit_events" USING btree ("denial_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "denials_identity_unique" ON "denials" USING btree ("payer_id","payer_claim_control_number","group_code","carc_code","service_line_ref");--> statement-breakpoint
CREATE INDEX "denials_queue_order" ON "denials" USING btree ("status","priority_bucket","rank_key");--> statement-breakpoint
CREATE INDEX "failed_login_attempts_email_time" ON "failed_login_attempts" USING btree ("email","attempted_at");--> statement-breakpoint
CREATE INDEX "jobs_status_run_after" ON "jobs" USING btree ("status","run_after");--> statement-breakpoint
CREATE UNIQUE INDEX "remittances_organization_sha256_unique" ON "remittances" USING btree ("organization_id","sha256");--> statement-breakpoint
CREATE INDEX "remittances_organization_created" ON "remittances" USING btree ("organization_id","created_at");