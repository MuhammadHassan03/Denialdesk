CREATE TYPE "public"."denial_event_type" AS ENUM('draft_created', 'draft_edited', 'approved', 'rejected', 'written_off', 'exported', 'marked_submitted', 'outcome_matched');--> statement-breakpoint
CREATE TYPE "public"."denial_status" AS ENUM('open', 'in_review', 'approved', 'submitted', 'resolved_paid', 'resolved_denied', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."draft_author" AS ENUM('ai', 'biller');--> statement-breakpoint
CREATE TYPE "public"."draft_kind" AS ENUM('corrected_claim', 'appeal_letter');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."upload_kind" AS ENUM('x12_835', 'eob_pdf');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('received', 'parsing', 'parsed', 'failed');--> statement-breakpoint
CREATE TABLE "denial_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"denial_id" uuid NOT NULL,
	"draft_id" uuid,
	"event_type" "denial_event_type" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "denials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid NOT NULL,
	"claim_number" text NOT NULL,
	"payer_name" text NOT NULL,
	"carc_codes" text[] NOT NULL,
	"rarc_codes" text[] NOT NULL,
	"amount_cents" integer NOT NULL,
	"service_date" date,
	"appeal_deadline" date,
	"status" "denial_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"denial_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"kind" "draft_kind" NOT NULL,
	"author" "draft_author" NOT NULL,
	"content" jsonb NOT NULL,
	"biller_note" text,
	"prompt_version" text,
	"model_name" text,
	"rules_passed" boolean NOT NULL,
	"rules_failures" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"payload" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payer_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payer_name" text NOT NULL,
	"carc_code" text NOT NULL,
	"policy_text" text NOT NULL,
	"source_title" text NOT NULL,
	"source_url" text NOT NULL,
	"retrieved_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "upload_kind" NOT NULL,
	"original_filename" text NOT NULL,
	"storage_path" text NOT NULL,
	"sha256" text NOT NULL,
	"status" "upload_status" DEFAULT 'received' NOT NULL,
	"biller_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "denial_events" ADD CONSTRAINT "denial_events_denial_id_denials_id_fk" FOREIGN KEY ("denial_id") REFERENCES "public"."denials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "denial_events" ADD CONSTRAINT "denial_events_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "denials" ADD CONSTRAINT "denials_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_denial_id_denials_id_fk" FOREIGN KEY ("denial_id") REFERENCES "public"."denials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drafts_denial_version_unique" ON "drafts" USING btree ("denial_id","version");