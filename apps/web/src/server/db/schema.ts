import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
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
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// Accounts (F1)

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const practices = pgTable("practices", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  addressLine: text("address_line"),
  npi: text("npi"),
  createdAt: createdAt(),
});

export const userRole = pgEnum("user_role", ["biller"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  practiceId: uuid("practice_id")
    .notNull()
    .references(() => practices.id),
  // Always stored lower-cased so lookups don't depend on how the biller typed it.
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  role: userRole("role").notNull().default("biller"),
  // Null until the biller sets a password from their setup link.
  passwordHash: text("password_hash"),
  createdAt: createdAt(),
});

export const userSetupTokens = pgTable("user_setup_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

// Failed sign-ins only, used for the lockout. Kept apart from audit_events
// because a failed attempt may name an email that has no user.
export const failedLoginAttempts = pgTable(
  "failed_login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("failed_login_attempts_email_time").on(table.email, table.attemptedAt)],
);

// Uploads and processing (F2, F3)

export const remittanceSource = pgEnum("remittance_source", ["835", "EOB"]);

export const remittanceStatus = pgEnum("remittance_status", [
  "queued",
  "processing",
  "done",
  "done_with_warnings",
  "failed",
]);

export const remittances = pgTable(
  "remittances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id),
    source: remittanceSource("source").notNull(),
    status: remittanceStatus("status").notNull().default("queued"),
    sha256: text("sha256").notNull(),
    originalFilename: text("original_filename").notNull(),
    storageUri: text("storage_uri").notNull(),
    denialCount: integer("denial_count"),
    // Counts for the upload result line, e.g. claims with no denials, already in queue.
    resultSummary: jsonb("result_summary"),
    // Plain-words message for the biller when processing failed or finished with warnings.
    billerMessage: text("biller_message"),
    errorId: text("error_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("remittances_organization_sha256_unique").on(table.organizationId, table.sha256),
    index("remittances_organization_created").on(table.organizationId, table.createdAt),
  ],
);

export const jobKind = pgEnum("job_kind", ["process_remittance", "draft_denial"]);

export const jobStatus = pgEnum("job_status", ["queued", "running", "done", "failed"]);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: jobKind("kind").notNull(),
    status: jobStatus("status").notNull().default("queued"),
    remittanceId: uuid("remittance_id").references(() => remittances.id),
    // Set for draft_denial jobs only.
    denialId: uuid("denial_id").references(() => denials.id),
    attempts: integer("attempts").notNull().default(0),
    lastErrorId: text("last_error_id"),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("jobs_status_run_after").on(table.status, table.runAfter),
    // A second click on "Write draft" must not queue a second job (F6). Only draft jobs
    // have a denial id, so the job kind doesn't need to be part of the condition.
    uniqueIndex("jobs_one_open_draft_per_denial")
      .on(table.denialId)
      .where(sql`${table.status} IN ('queued', 'running')`),
  ],
);

export const payers = pgTable("payers", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  // REF*2U from the 835, when the payer sends one.
  payerIdentifier: text("payer_identifier"),
  appealWindowDays: integer("appeal_window_days"),
  createdAt: createdAt(),
});

export const denialStatus = pgEnum("denial_status", [
  "needs_check",
  "new",
  "drafting",
  "in_review",
  "approved",
  "submitted",
  "paid",
  "denied_again",
  "written_off",
  "manual",
]);

export const draftAction = pgEnum("draft_action", ["appeal", "corrected_claim"]);

export const priorityBucket = pgEnum("priority_bucket", [
  "overdue",
  "due_within_7",
  "due_within_30",
  "due_later",
]);

export const denials = pgTable(
  "denials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    remittanceId: uuid("remittance_id")
      .notNull()
      .references(() => remittances.id),
    payerId: uuid("payer_id")
      .notNull()
      .references(() => payers.id),
    patientControlNumber: text("patient_control_number").notNull(),
    payerClaimControlNumber: text("payer_claim_control_number").notNull(),
    claimStatusCode: text("claim_status_code").notNull(),
    groupCode: text("group_code").notNull(),
    carcCode: text("carc_code").notNull(),
    rarcCodes: text("rarc_codes").array().notNull(),
    // "claim" for claim-level adjustments, otherwise the line's REF*6R or its position.
    serviceLineRef: text("service_line_ref").notNull(),
    procedureCode: text("procedure_code"),
    procedureModifiers: text("procedure_modifiers").array().notNull(),
    lineChargeCents: integer("line_charge_cents"),
    linePaidCents: integer("line_paid_cents"),
    claimChargeCents: integer("claim_charge_cents").notNull(),
    claimPaidCents: integer("claim_paid_cents").notNull(),
    amountAtStakeCents: integer("amount_at_stake_cents").notNull(),
    serviceDate: date("service_date", { mode: "string" }),
    paymentDate: date("payment_date", { mode: "string" }).notNull(),
    appealDeadline: date("appeal_deadline", { mode: "string" }).notNull(),
    deadlineIsEstimate: boolean("deadline_is_estimate").notNull(),
    status: denialStatus("status").notNull(),
    priorityBucket: priorityBucket("priority_bucket").notNull(),
    rankKey: text("rank_key").notNull(),
    // The biller's facts-check answers and the action they lead to (F6). Null until saved.
    billerFacts: jsonb("biller_facts"),
    draftAction: draftAction("draft_action"),
    // Plain-words message when the last draft attempt failed. Cleared when a draft is saved.
    draftFailureMessage: text("draft_failure_message"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("denials_identity_unique").on(
      table.payerId,
      table.payerClaimControlNumber,
      table.groupCode,
      table.carcCode,
      table.serviceLineRef,
    ),
    index("denials_queue_order").on(table.status, table.priorityBucket, table.rankKey),
  ],
);

// Payer policy text the drafts may quote (F5, F7). Synthetic until real policies are loaded.

export const payerPolicies = pgTable(
  "payer_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    payerId: uuid("payer_id")
      .notNull()
      .references(() => payers.id),
    // The payer's own id for the policy, e.g. "NW-PA-2026-04". Drafts cite this.
    policyId: text("policy_id").notNull(),
    // The denial code this policy answers, e.g. "CO-197".
    denialCode: text("denial_code").notNull(),
    topic: text("topic").notNull(),
    policyText: text("policy_text").notNull(),
    sourceUrl: text("source_url").notNull(),
    effectiveDate: date("effective_date", { mode: "string" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("payer_policies_payer_policy_date_unique").on(
      table.payerId,
      table.policyId,
      table.effectiveDate,
    ),
    index("payer_policies_payer_code").on(table.payerId, table.denialCode),
  ],
);

// NCCI procedure-to-procedure edits for the rules check (F7). Not tied to an organization.

export const ncciEdits = pgTable(
  "ncci_edits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    columnOneCode: text("column_one_code").notNull(),
    columnTwoCode: text("column_two_code").notNull(),
    modifierAllowed: boolean("modifier_allowed").notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("ncci_edits_pair_unique").on(table.columnOneCode, table.columnTwoCode)],
);

// Drafts and their rules checks (F6, F7). A draft is never updated; a new version is a new row.

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    denialId: uuid("denial_id")
      .notNull()
      .references(() => denials.id),
    version: integer("version").notNull(),
    action: draftAction("action").notNull(),
    // The model's output as it came back. Parsed into the draft shape before anything uses it.
    content: jsonb("content").notNull(),
    billerFacts: jsonb("biller_facts").notNull(),
    modelName: text("model_name").notNull(),
    promptVersion: text("prompt_version").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    costCents: integer("cost_cents").notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("drafts_denial_version_unique").on(table.denialId, table.version)],
);

export const rulesOutcome = pgEnum("rules_outcome", ["pass", "warn", "fail"]);

export const rulesChecks = pgTable("rules_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  draftId: uuid("draft_id")
    .notNull()
    .unique()
    .references(() => drafts.id),
  overall: rulesOutcome("overall").notNull(),
  // One entry per check: name, outcome, reason.
  checks: jsonb("checks").notNull(),
  createdAt: createdAt(),
});

// History (F13). Append-only: a database trigger rejects UPDATE and DELETE.

export const auditActor = pgEnum("audit_actor", ["user", "system"]);

export const auditAction = pgEnum("audit_action", [
  "login",
  "logout",
  "login_failed",
  "upload",
  "denial_created",
  "opened",
  "details_confirmed",
  "deadline_changed",
  "facts_saved",
  "action_overridden",
  "draft_requested",
  "draft_created",
  "rules_checked",
  "draft_edited",
  "draft_rejected",
  "approved",
  "written_off",
  "reopened",
  "exported",
  "copied",
  "submitted",
  "outcome_matched",
]);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    actor: auditActor("actor").notNull(),
    userId: uuid("user_id").references(() => users.id),
    denialId: uuid("denial_id").references(() => denials.id),
    remittanceId: uuid("remittance_id").references(() => remittances.id),
    action: auditAction("action").notNull(),
    draftVersion: integer("draft_version"),
    // References and small facts only. Never claim contents or patient details.
    details: jsonb("details").notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [index("audit_events_denial_created").on(table.denialId, table.createdAt)],
);
