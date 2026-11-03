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

export const jobKind = pgEnum("job_kind", ["process_remittance"]);

export const jobStatus = pgEnum("job_status", ["queued", "running", "done", "failed"]);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: jobKind("kind").notNull(),
    status: jobStatus("status").notNull().default("queued"),
    remittanceId: uuid("remittance_id").references(() => remittances.id),
    attempts: integer("attempts").notNull().default(0),
    lastErrorId: text("last_error_id"),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("jobs_status_run_after").on(table.status, table.runAfter)],
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
