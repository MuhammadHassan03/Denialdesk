import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const uploadKind = pgEnum("upload_kind", ["x12_835", "eob_pdf"]);

export const uploadStatus = pgEnum("upload_status", ["received", "parsing", "parsed", "failed"]);

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: uploadKind("kind").notNull(),
  originalFilename: text("original_filename").notNull(),
  storagePath: text("storage_path").notNull(),
  sha256: text("sha256").notNull(),
  status: uploadStatus("status").notNull().default("received"),
  billerErrorMessage: text("biller_error_message"),
  createdAt: createdAt(),
});

export const jobStatus = pgEnum("job_status", ["queued", "running", "done", "failed"]);

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  status: jobStatus("status").notNull().default("queued"),
  payload: jsonb("payload").notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const denialStatus = pgEnum("denial_status", [
  "open",
  "in_review",
  "approved",
  "submitted",
  "resolved_paid",
  "resolved_denied",
  "written_off",
]);

export const denials = pgTable("denials", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadId: uuid("upload_id")
    .notNull()
    .references(() => uploads.id),
  claimNumber: text("claim_number").notNull(),
  payerName: text("payer_name").notNull(),
  carcCodes: text("carc_codes").array().notNull(),
  rarcCodes: text("rarc_codes").array().notNull(),
  amountCents: integer("amount_cents").notNull(),
  serviceDate: date("service_date", { mode: "string" }),
  appealDeadline: date("appeal_deadline", { mode: "string" }),
  status: denialStatus("status").notNull().default("open"),
  createdAt: createdAt(),
});

export const payerPolicies = pgTable("payer_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  payerName: text("payer_name").notNull(),
  carcCode: text("carc_code").notNull(),
  policyText: text("policy_text").notNull(),
  sourceTitle: text("source_title").notNull(),
  sourceUrl: text("source_url").notNull(),
  retrievedOn: date("retrieved_on", { mode: "string" }).notNull(),
  createdAt: createdAt(),
});

export const draftKind = pgEnum("draft_kind", ["corrected_claim", "appeal_letter"]);

export const draftAuthor = pgEnum("draft_author", ["ai", "biller"]);

// Drafts are never updated in place. Every regenerate or edit inserts a new version.
export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    denialId: uuid("denial_id")
      .notNull()
      .references(() => denials.id),
    version: integer("version").notNull(),
    kind: draftKind("kind").notNull(),
    author: draftAuthor("author").notNull(),
    content: jsonb("content").notNull(),
    billerNote: text("biller_note"),
    promptVersion: text("prompt_version"),
    modelName: text("model_name"),
    rulesPassed: boolean("rules_passed").notNull(),
    rulesFailures: jsonb("rules_failures").notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("drafts_denial_version_unique").on(table.denialId, table.version)],
);

export const denialEventType = pgEnum("denial_event_type", [
  "draft_created",
  "draft_edited",
  "approved",
  "rejected",
  "written_off",
  "exported",
  "marked_submitted",
  "outcome_matched",
]);

// The full history of a denial. Approvals here are the proof that the biller,
// not the AI, released a document.
export const denialEvents = pgTable("denial_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  denialId: uuid("denial_id")
    .notNull()
    .references(() => denials.id),
  draftId: uuid("draft_id").references(() => drafts.id),
  eventType: denialEventType("event_type").notNull(),
  reason: text("reason"),
  createdAt: createdAt(),
});
