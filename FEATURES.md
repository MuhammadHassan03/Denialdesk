# Denialdesk features (biller MVP)

This is the full spec for every feature in the biller MVP. Read AGENTS.md first; its rules win if anything here conflicts with them. If a step here is unclear, contradicts another step, or looks like the wrong track, stop and ask before writing code.

Each feature has the same parts:

- What it is for
- Where the biller finds it
- The flow, click by click, with what happens behind each click
- Every case: errors, empty states and odd inputs
- Acceptance criteria: what must be true before the feature counts as done

## Contents

0. Shared rules (statuses, screens, money, dates, errors)
1. Login and session
2. Upload files
3. Processing: parsing and normalizing
4. Work queue
5. Denial detail
6. Facts check and AI draft
7. Rules check
8. Editing and regenerating a draft
9. Decision: approve, reject, write off
10. Export
11. Tracking and outcome matching
12. Personal stats and the timer
13. History (audit trail)

---

## 0. Shared rules

### 0.1 Screens

| Route | Screen | Reached from |
| --- | --- | --- |
| `/login` | Login | Any page when signed out |
| `/upload` | Upload files and see processing status | Top nav "Upload" |
| `/queue` | Ranked work queue (the home page after login) | Top nav "Queue", logo |
| `/denials/[id]` | One denial: reasons, facts, draft, decision, history | Clicking a queue row |
| `/stats` | Personal stats | Top nav "Stats" |

The top nav is on every signed-in page: Queue (with a count of open denials), Upload, Stats, and a menu with "Sign out".

### 0.2 Denial statuses

Every denial has exactly one status. Status changes only happen in the server actions and pipeline steps named in this spec, and every change writes an AuditEvent (feature 13).

| Status | Meaning | Set by |
| --- | --- | --- |
| `needs_check` | Came from an EOB PDF, and the biller must confirm the extracted fields | Processing (F3) |
| `new` | Parsed and ranked, not opened yet | Processing (F3), or biller confirms an EOB denial (F5) |
| `drafting` | A draft is being generated or regenerated | F6, F8 |
| `in_review` | A draft exists and the biller is reviewing it (whether it passed or failed the rules check) | F6, F7 |
| `approved` | Biller approved the draft; ready to export | F9 |
| `submitted` | Biller says they sent it to the payer | F11 |
| `paid` | A later 835 shows payment | F11 |
| `denied_again` | A later 835 shows another denial | F11 |
| `written_off` | Biller decided not to pursue it | F9 |
| `manual` | Code not supported yet; the biller works it outside Denialdesk | F3 |

Open statuses (shown in the queue by default): `needs_check`, `new`, `drafting`, `in_review`, `approved`, `manual`.
Closed statuses: `submitted`, `paid`, `denied_again`, `written_off`. A `denied_again` denial is closed, and its follow-up is a new linked denial (F11).

### 0.3 Supported denial codes

| Code | Plain meaning | Default suggested action |
| --- | --- | --- |
| CO-197 | Precertification or authorization was missing | Depends on facts (F6): auth existed → appeal; auth can be added → fix |
| CO-50 | Payer says the service was not medically necessary | Appeal |
| CO-4 | The procedure code and modifier don't match, or a modifier is missing | Fix (corrected claim) |
| CO-16 | The claim is missing information or has billing errors | Fix (corrected claim) |
| CO-29 | The time limit for filing has expired | Depends on facts (F6): proof of timely filing → appeal; no proof → write off |

Any other code gets status `manual`. The detail page still shows its plain meaning from the code table, but there's no draft.

Codes that are normal adjustments and never count as denials: CO-45 (charge exceeds the fee schedule) and patient responsibility codes PR-1, PR-2 and PR-3 (deductible, coinsurance, copay). Keep this list in one config file, `codes/not_denials.py`.

### 0.4 Money, dates and time

- Money is integer cents everywhere. It's shown as `$1,234.56`.
- An appeal deadline is a date with no time. Days left = deadline minus today, in the biller's timezone, which is stored on the user and defaults to `America/New_York`.
- Timestamps are UTC in the database and shown in the biller's timezone.

### 0.5 Error messages

Every error the biller sees has three parts: what happened, why if we know, and what to do next. Example: "We couldn't read this file. It looks like an 837 claim file, not an 835 remittance. Upload the 835 you got back from the payer." Technical details go to the logs with an error ID, and that ID is shown in small text so support can find it.

### 0.6 Accessibility

All flows work by keyboard alone. Focus is always visible. Status is never shown by colour alone; every badge has words. Every screen meets WCAG 2.2 AA.

---

## 1. Login and session

### What it is for

Only the invited biller can see the workspace, and an idle session closes by itself because this app holds health data.

### Where

`/login`. Any signed-in route redirects there when there's no valid session.

### How a user gets an account

There's no public sign-up in the MVP. You create the biller with a CLI script:

```
pnpm create-user --email biller@example.com --name "Jane Doe" --timezone America/Chicago
```

The script creates an Organization (if one doesn't exist yet), a Practice, and the User with role `biller`, then prints a one-time setup link that is valid for 24 hours. On that link the biller sets their password.

### Flow

1. The biller opens any page and gets sent to `/login?next=<original path>`.
2. They enter email and password and click "Sign in".
3. A server action looks up the user by lower-cased email and verifies the password hash with argon2id.
4. On success it creates a row in `sessions` (random 32-byte token, stored hashed), sets an HTTP-only, Secure, SameSite=Lax cookie, and records `AuditEvent(action = "login")`. The biller is redirected to `next`, or to `/queue`.
5. On every request, middleware checks the session. If more than 30 minutes have passed since the last request, the session is ended and the biller goes back to `/login` with the message "You were signed out after 30 minutes of inactivity."
6. "Sign out" deletes the session row, clears the cookie and records `AuditEvent(action = "logout")`.

### Every case

| Case | What happens |
| --- | --- |
| Wrong email or wrong password | The same message for both: "Email or password is incorrect." Never reveal which one. |
| 5 failed attempts in 15 minutes for one email | Lock that email for 15 minutes: "Too many attempts. Try again in 15 minutes." Log it. |
| Setup link expired or already used | "This link has expired. Ask for a new one." The script can issue a new link. |
| Password too short | Minimum 12 characters, shown before submit. No other composition rules. |
| `next` points to another site | Ignore it and go to `/queue`. Only relative paths are allowed. |
| Session cookie present but its row was deleted | Treat as signed out. |
| Two tabs open, one signs out | The other tab's next request lands on `/login`. |

### Acceptance criteria

- No signed-in page or server action works without a valid session (tested for every route and action).
- Passwords are stored only as argon2id hashes. Session tokens are stored only hashed.
- Idle timeout is 30 minutes, set in one named constant.
- Login, logout and failed logins all create audit events with no password data in them.

---

## 2. Upload files

### What it is for

The biller brings in the payer's responses: 835 files (ERA, electronic remittance advice) and EOB PDFs.

### Where

`/upload`, the top nav "Upload", and an "Upload files" button on the empty queue.

### Flow

1. The biller sees a drop zone that says "Drop 835 files or EOB PDFs here, or browse", plus a list of their recent uploads with their status.
2. They drop or pick one or more files, up to 20 files and 25 MB each.
3. The browser checks each file's size and extension right away (`.835`, `.txt`, `.edi`, `.x12`, `.pdf`). A file that fails shows an inline error and is not sent; the rest go ahead.
4. Each accepted file uploads with its own progress bar. Behind it:
   1. The server action streams the file to encrypted storage (local disk in dev, an encrypted bucket later) under a random name.
   2. It computes a SHA-256 hash of the file.
   3. It creates a `Remittance` row with `status = "queued"`, `source = "835"` or `"EOB"`, the hash, the original file name and the storage URI.
   4. It creates a row in `jobs` with `kind = "process_remittance"` and the remittance id.
   5. It writes `AuditEvent(action = "upload")`.
5. The row in the upload list now shows "Queued", then "Processing", then either "Done: 14 denials found" with a link "Open in queue" or an error. The page polls every 3 seconds while any row is queued or processing, and stops when none are.

How the source type is decided: `.pdf` is an EOB. Any other allowed extension is read as text, and if it starts with an `ISA` segment it is treated as X12. The real check happens in processing (F3).

### Every case

| Case | What happens |
| --- | --- |
| File too large | "This file is over 25 MB. EOBs are usually much smaller; check you picked the right file." Not uploaded. |
| Wrong extension (e.g. `.xlsx`) | "Denialdesk reads 835 files and EOB PDFs. This is an .xlsx file." Not uploaded. |
| More than 20 files at once | The first 20 upload; the rest show "Upload these in another batch." |
| The exact same file uploaded again (same hash) | Not processed again. The row says "Already uploaded on Oct 12" with a link to that upload. |
| Network drops mid-upload | That row shows "Upload failed" with a "Retry" button. Nothing is stored for it. |
| Storage write fails | The same as above, plus an error ID in the logs. No Remittance row is left behind. |
| The biller leaves the page during processing | Processing continues in the worker. The status is there when they come back. |
| Empty file (0 bytes) | "This file is empty." Not uploaded. |
| Password-protected PDF | Uploads, then fails in processing with "This PDF is password protected. Save a copy without a password and upload it again." |

### Acceptance criteria

- Upload never blocks on processing; the action returns as soon as the file is stored and the job is queued.
- Duplicate detection is by file hash and is per organization.
- Files are never stored inside the repo, in public folders, or in logs.
- Upload list shows the last 50 uploads, newest first.

---

## 3. Processing: parsing and normalizing

### What it is for

This turns a raw file into clean Denial records. The biller never sees this step happen, only its result in the upload list and the queue.

### Where

The pipeline worker (`services/pipeline/.../jobs/`) picks up `process_remittance` jobs.

### Flow for an 835 file

1. The worker claims the oldest queued job with `SELECT ... FOR UPDATE SKIP LOCKED`, sets the Remittance to `processing`, and loads the file.
2. `intake/x12_835.py` parses it:
   1. It reads the separators from the ISA segment (element separator at position 3, segment terminator at the end of ISA, sub-element separator at ISA16). Never hard-code `*` or `~`.
   2. It checks that ST01 is `835`. If it's `837`, `277` or anything else, the job fails with a clear message.
   3. It reads the payer from the `N1*PR` loop (name, and the payer id from `REF*2U` when present), the payment date from `BPR16`, and the check or EFT trace number from `TRN02`.
   4. For each claim (`CLP` loop) it reads: patient control number `CLP01`, claim status `CLP02`, total charge `CLP03`, paid amount `CLP04`, payer claim control number `CLP07`, claim-level `CAS` adjustments, the remark codes in `MOA` and `LQ*HE`, service dates from `DTM*232` / `DTM*233`, and each service line (`SVC`, its `DTM*472` date, its `CAS` adjustments and its `LQ*HE` remarks).
   5. Every amount becomes integer cents at parse time.
3. `normalize/` turns parsed claims into Denial records:
   1. A claim or service line is a denial if it has a `CAS` adjustment whose group code is `CO`, `OA` or `PI` and whose reason code is not in `not_denials.py`, or if `CLP02` is `4` (denied).
   2. One Denial per claim per denial reason. If one claim has CO-4 on one line and CO-16 on another, that's two denials. Each keeps the line it belongs to.
   3. Amount at stake = the sum of that reason's CAS amounts on that claim.
   4. The Payer is matched by payer id, then by exact name; if neither matches, a new Payer row is created.
   5. Status = `new` for the five supported codes and `manual` for any other.
4. Appeal deadline: payment date plus the payer's `appeal_window_days`. If the payer has no window stored, use `DEFAULT_APPEAL_WINDOW_DAYS` (start at 90) and set `deadline_is_estimate = true`. The detail page shows "Estimated" and lets the biller correct the date (F5).
5. Ranking (`rank/`) is deterministic and easy to explain:
   1. Bucket by days left: overdue, 0 to 7, 8 to 30, more than 30.
   2. Inside a bucket, sort by amount at stake, largest first.
   3. Then by deadline, earliest first, and then by id, so the order is stable.
   4. Store `priority_bucket` and `rank_key` on the denial, and recompute every night and whenever the deadline changes.
6. Each Denial is inserted in one transaction with its audit events (`action = "denial_created"`). The Remittance gets `status = "done"` and `denial_count`.

Duplicate denials: a denial is unique on `(payer_id, payer_claim_control_number, reason_code, service_line_ref)`. If a new file contains a denial we already have, we skip it and count it as "already in your queue". If the same claim now shows payment, that's outcome matching (F11), not a new denial.

### Flow for an EOB PDF

1. `intake/eob_pdf.py` runs Docling with OCR on. The default backend uses docling-parse for text and pypdfium2 for page images. The output is the document's text and tables.
2. An LLM call through `llm_client.py` extracts the same fields an 835 gives (payer, claim numbers, dates, codes, amounts) into a strict Pydantic schema, with the page number for every field.
3. Denials are created exactly as for 835s, with status `needs_check` instead of `new`, and the extraction is kept so the biller can compare it to the PDF (F5).
4. Until the BAA is in place this only runs on synthetic EOBs.

### Every case

| Case | What happens |
| --- | --- |
| File is X12 but not an 835 | The upload fails: "This is an 837 claim file. Denialdesk needs the 835 remittance that comes back from the payer." |
| File is not X12 at all | The upload fails: "We couldn't find an 835 in this file." |
| 835 is cut off (missing SE/GE/IEA) | Parse what's complete, mark the upload "Done with warnings: the file looks incomplete; 3 claims may be missing," and log the segment count. |
| Segment count in SE doesn't match | The same "done with warnings" message. Never fail silently. |
| File has several ST/SE transactions | Process each one. |
| Claim has no denials | It's skipped and counted in "claims with no denials". |
| No denials in the whole file | Done: "No denials in this file. 42 claims were paid in full." |
| Unknown CAS reason code | The denial is created with status `manual` and code text "Unknown code CO-999". |
| Negative amounts (reversals, `CLP02 = 22`) | Not a denial. Store the reversal for outcome matching and log it. |
| EOB PDF has no readable text even after OCR | The upload fails: "We couldn't read this PDF. If it's a photo, try a clearer scan." |
| EOB extraction misses required fields | Denial created as `needs_check`, with the missing fields marked empty for the biller to fill. |
| Worker crashes mid-job | The transaction rolls back. The job's `attempts` goes up, and it retries up to 3 times with a back-off. After that the upload shows "Processing failed" with an error ID and a "Try again" button that queues a new job. |
| Two workers running | `SKIP LOCKED` stops the same job from running twice. |

### Acceptance criteria

- The X12 parser passes tests on synthetic files covering every case in the table.
- No float is ever used for money in parsing.
- Every created denial has a payer, a reason code, an amount at stake, a deadline (real or estimated), a status, and a rank.
- The same file processed twice gives exactly the same denials and the same order.

---

## 4. Work queue

### What it is for

This is the biller's home screen: the list of what to work next, most valuable and most urgent first.

### Where

`/queue`, the default after login.

### What's on the screen

- A header that reads "Open denials: 128 · $84,210.00 at stake · 9 due in 7 days".
- A filter bar with:
  - Status: open by default, or any single status, or "All"
  - Denial code: multi-select of the codes present
  - Payer: multi-select
  - Due: overdue, within 7 days, within 30 days, any
  - A search box for claim number or patient control number
- The table, one row per denial, with these columns:
  - Rank number
  - Days left, as a badge with words, for example "Overdue 3 days", "Due in 5 days" or "Due Dec 20"
  - Amount at stake
  - Code and its short meaning, for example "CO-197 No prior auth"
  - Payer
  - Claim number
  - Service date
  - Status badge
  - Suggested action ("Appeal", "Fix", "Write off?" or "Review manually")
- Pagination at 50 rows per page.

### Flow

1. The page loads as a Server Component. The query reads open denials sorted by `priority_bucket`, then `rank_key`, applying the filters from the URL query string (so a filtered view can be bookmarked).
2. A denial due within 7 days gets a warning badge with the words "Due in 5 days". An overdue one gets "Overdue". The badges have icons and words, never colour alone.
3. Clicking a row, or pressing Enter on a focused row, opens `/denials/[id]`. This starts the denial timer (F12).
4. Keyboard: `j` and `k` move between rows, `Enter` opens one, and `/` focuses the search box. These shortcuts are listed in a "Keyboard shortcuts" popover.
5. Changing a filter updates the URL and reloads the list. Page and scroll position are kept when the biller comes back from a denial.

### Every case

| Case | What happens |
| --- | --- |
| No uploads yet | An empty state with the text "No denials yet. Upload an 835 or EOB to start," plus a button to `/upload`. |
| Uploads exist but no open denials | "You're all caught up. Every denial has been worked." Then a link to show closed ones. |
| Filters match nothing | "No denials match these filters," with a "Clear filters" button. |
| A denial's deadline passes while the page is open | Shown correctly on next load. No live countdown is needed. |
| Estimated deadline | The badge text ends with "(est.)". |
| Status `needs_check` | Row badge "Check fields"; suggested action is "Confirm details". |
| Status `manual` | Row badge "Manual"; suggested action is "Review manually". |
| Status `drafting` | Row badge "Drafting..." (the draft is being written). |
| Search text matches nothing | Same as "filters match nothing". |
| Very long payer names | Cut off with an ellipsis and the full name in a tooltip and in the accessible name. |

### Acceptance criteria

- Order is exactly as defined in F3 ranking, with tests.
- The page loads in under 1 second with 5,000 denials in the database (an index on status, bucket and rank key).
- Filters live in the URL.
- Everything works by keyboard, and screen readers announce the badge words.

---

## 5. Denial detail

### What it is for

One page shows everything about one denial: what the payer said, what it means, what to do, and the draft.

### Where

`/denials/[id]`, opened from a queue row.

### Layout, top to bottom

1. **Header:** claim number, payer, service date, amount at stake, days-left badge, status badge, plus buttons "Previous" and "Next" (the neighbours in the queue's current order and filters) and "Back to queue".
2. **What happened:** each reason code with its plain-English meaning from the code table, the remark codes (RARC) with their meanings, and the service line it applies to (procedure code, modifiers, billed amount, paid amount).
3. **Suggested action**: "Appeal", "Fix and resubmit", "Write off" or "Review manually", with one sentence explaining why, for example "CO-50 means the payer thinks the service wasn't needed. Payers often reverse this when the appeal points to their own coverage policy and the chart notes."
4. **Payer policy:** the stored PayerPolicy records that match this payer and code, each with its text, source link and effective date. If none are stored: "We don't have this payer's policy for CO-50 yet. The draft will rely on general rules and will be marked for extra care." (F7 handles what that means.)
5. **Facts and draft:** F6 and F8.
6. **Decision buttons:** F9.
7. **History:** F13, collapsed by default.

### Flow

1. The page loads the denial, its claim lines, codes, policies, the latest draft and its rules check.
2. It writes `AuditEvent(action = "opened")` and starts or resumes the timer (F12).
3. If status is `new`, it stays `new` until the biller does something. Opening a denial doesn't change its status.
4. Editing the deadline: the biller clicks "Edit" beside the deadline, picks a date, and saves. The server action stores it, sets `deadline_is_estimate = false`, re-ranks the denial and writes an audit event with the old and new dates.

### `needs_check` flow (from an EOB)

1. A banner says "These details were read from a PDF. Check them against the document before drafting."
2. The page shows the extracted fields side by side with the page image they came from (the page number is stored). Missing fields are empty and marked "Required".
3. The biller corrects anything wrong and clicks "Confirm details".
4. The server action validates the fields (amount is a positive number, a known code format, a valid date), saves them, sets status to `new`, and writes an audit event listing which fields the biller changed. The F6 flow is then available.

### Every case

| Case | What happens |
| --- | --- |
| Denial id not found | A 404 page: "This denial doesn't exist or was removed," with a link to the queue. |
| Denial belongs to another organization | Same 404 (never reveal it exists). |
| Code has no meaning in the table | Show "We don't have a description for this code yet," and the status is `manual`. |
| Several reason codes on one claim | Each is its own denial (F3). This page shows the others under "Other denials on this claim", with links. |
| "Next" at the end of the list | The button is disabled with the text "Last denial in this view". |
| Biller edits the deadline to a past date | Allowed, with a warning: "This date is in the past. The denial will show as overdue." |
| Denial is closed (submitted, paid, written off) | The page is read-only except "Reopen" (F9). |

### Acceptance criteria

- Every code shown has its meaning next to it; codes are never shown alone.
- The policy section always shows its source link and effective date.
- `needs_check` denials cannot get a draft until confirmed.
- Previous and Next follow the queue's current filters and order.

---

## 6. Facts check and AI draft

### What it is for

This writes the corrected claim or the appeal letter for the biller. The facts check comes first, so the AI never has to guess a fact the biller knows.

### Where

The "Draft" section of the denial page, for denials with status `new` or `in_review`.

### Step 1: facts check

Some actions depend on facts only the biller has. Before drafting, the page asks a short set of questions for the code. The questions live in a config file per code, not in the prompt.

| Code | Questions |
| --- | --- |
| CO-197 | Was an authorization obtained before the service? (yes, no, not sure) If yes: auth number and the date it was issued. |
| CO-50 | Do you have chart notes supporting the need for the service? (yes, no) Which diagnosis codes support it? (prefilled from the claim, editable) |
| CO-4 | Which modifier should the line have? (picker from the allowed modifier list; the suggested one is preselected if the rules know it) |
| CO-16 | Which information was missing? (prefilled from the remark codes; the biller confirms or adds the corrected values) |
| CO-29 | Do you have proof the claim was filed on time? (yes, no) If yes: the original submission date and the proof type (clearinghouse report, payer acknowledgement). |

The answers can change the suggested action, deterministically and in code, not by the AI:

- CO-197 with auth "yes" → appeal. With "no" → fix only if the auth can be obtained retroactively, otherwise suggest a write-off and explain why. "Not sure" → the draft is an appeal asking the payer to recheck, marked "Check the auth before sending."
- CO-29 with proof "yes" → appeal. With "no" → suggest a write-off with the reason "There's no proof of timely filing, so an appeal is unlikely to succeed."

The biller can override the suggested action with a picker. The override is recorded in history.

### Step 2: generate the draft

1. The biller clicks "Write draft" (or "Write appeal" / "Write corrected claim", depending on the action).
2. The server action saves the facts, sets status to `drafting`, writes an audit event, and queues a `draft_denial` job. The button changes to "Writing your draft..." with a spinner. The page polls every 2 seconds.
3. The pipeline worker builds the input:
   - The denial record: codes and meanings, claim lines, amounts and dates
   - The biller's facts
   - The matching PayerPolicy records, each with its id
   - The prompt file for this action, for example `prompts/appeal_v1.md` or `prompts/corrected_claim_v1.md`
4. `llm_client.py` calls the model and asks for structured output.
5. The output must match the Pydantic schema for the action.
   - **Appeal letter:** recipient block, subject line, claim references, a paragraph explaining what is being appealed, the argument with citations by policy id, the requested outcome, a list of attachments to include (for example "Chart notes for date of service 2026-09-14"), and the sign-off block with placeholders for the biller's name.
   - **Corrected claim:** frequency code 7, the original payer claim control number, and a list of field changes. Each change gives the field, the old value, the new value and the reason.
6. The draft is saved as a new Draft version with the model name, prompt version, token counts and cost in cents.
7. The rules check runs at once (F7).
8. Status becomes `in_review`. The page shows the draft and its rules result.

### Every case

| Case | What happens |
| --- | --- |
| Facts incomplete | The "Write draft" button is disabled. The missing questions are marked "Required". |
| LLM call times out (60 seconds) | Retry once. If it fails again: status goes back to `new`, and the page shows "We couldn't write the draft right now. Try again in a minute." The facts are kept. |
| LLM returns output that doesn't match the schema | Treat it as a failed attempt and retry once with the validation error. If it still fails, the same message as above, and the failure is logged with the draft id but no claim content. |
| No payer policy stored | Draft anyway using general rules, with a visible warning in the draft panel: "No payer policy on file. Check this letter against the payer's current policy before sending." The rules check adds a warning (not a fail). |
| Biller clicks "Write draft" twice | The second click is ignored while a draft job exists for this denial (a unique open job per denial). |
| Biller leaves the page during drafting | The job finishes. The queue row shows "Drafting..." and then "In review". |
| Status `manual` | There's no draft section. It says: "Denialdesk doesn't draft for this code yet. Work it in your usual way, then mark it as submitted or written off." |
| Suggested action is write off | The draft section shows the reasons for writing off and a "Write off" button (F9), plus "Draft an appeal anyway" which needs a one-line reason from the biller. |

### Acceptance criteria

- The suggested action comes from code and facts, never from the LLM.
- Every draft records its model, prompt version, input and output token counts and cost.
- The LLM is called only from `llm_client.py`. Tests use recorded responses.
- A draft is never shown before the rules check has run on it.

---

## 7. Rules check

### What it is for

This deterministic check catches anything the AI got wrong or made up before the biller relies on it. It is the most important safety feature in the product.

### Where

It runs in the pipeline after every draft and after every saved edit. Its result is shown at the top of the draft panel.

### The checks

Each check returns pass, warn or fail, with a short reason the biller can read. Any fail blocks approval. Warnings don't block, but the biller must tick "I've reviewed the warnings" before approving.

| Check | Applies to | Fail when |
| --- | --- | --- |
| Schema valid | All | The draft doesn't match its schema (should already be caught in F6) |
| Claim references correct | All | Claim number, payer claim control number, patient control number, service date or amounts differ from the denial record |
| Citations exist | Appeals | A cited policy id doesn't exist for this payer |
| Quotes are real | Appeals | Any text in quotation marks is not found word for word in the cited policy |
| Required parts present | Appeals | Subject, claim references, argument, requested outcome or attachment list is missing |
| No leftover placeholders | All | Text such as `[NAME]`, `TBD`, `XXX` or `{{` remains, except the biller signature placeholder |
| Facts respected | All | The draft contradicts a fact the biller gave (for example it says no auth existed when the biller said yes) |
| Frequency code | Corrected claims | Frequency code is not 7, or the original payer claim control number is missing |
| Changes are justified | Corrected claims | A change has no reason, or changes a field that this code doesn't allow to change (configured per code) |
| Modifier allowed | CO-4 | The new modifier isn't in the allowed modifier list |
| NCCI pair edit | Corrected claims that change procedure codes | The new code pair appears in the stored NCCI procedure-to-procedure edits without an allowed modifier |
| Deadline | All | Deadline has passed (warn, not fail: the biller may still send it) |
| No policy on file | Appeals | Warn: "No payer policy on file" |

### Flow

1. The pipeline runs every check in order and stores one RulesCheck row per draft version: overall result, plus each check's name, result and reason.
2. If the overall result is fail on a fresh AI draft, the pipeline automatically asks the LLM once more, passing the failed reasons. This retry is a new draft version with its own rules check.
3. The panel shows a summary, "Checks passed" or "2 problems to fix", and expands to the list. Each fail item scrolls to the place in the draft it's about when clicked.

### Every case

| Case | What happens |
| --- | --- |
| Draft fails twice | Shown to the biller with the failures listed. They can edit it (F8) or regenerate with a note. Approve stays disabled. |
| A check itself crashes (a bug) | That check counts as fail with the reason "This check couldn't run," and the error is logged. Never count a crashed check as a pass. |
| Policy text changed since drafting | Checks run against the policy version the draft cited (stored by id and effective date). |
| Biller edits fix all the failures | Saving re-runs the checks (F8). Approve becomes available once they pass. |

### Acceptance criteria

- The checks are pure functions with unit tests, including at least one failing case each.
- A draft with an invented quote or citation always fails (tested with recorded bad drafts).
- Approve is impossible while any check fails, enforced on the server, not just by disabling the button.

---

## 8. Editing and regenerating a draft

### What it is for

The biller stays in control: they can fix a draft by hand or ask for a new one with direction.

### Where

The draft panel on the denial page.

### Editing flow

1. The draft appears in an editor. Appeal letters use a plain text editor with paragraphs. Corrected claims use a table of field changes where each value is editable.
2. "Unsaved changes" shows as soon as the biller types. Leaving the page with unsaved changes asks for confirmation.
3. "Save changes" sends the edited content to a server action, which stores it as a new Draft version with `author = "biller"` and the previous version id. It then queues the rules check, which runs in seconds, and the panel updates.
4. "Compare with AI version" shows the differences between the biller's version and the version they started from.

### Regenerate flow

1. The biller clicks "Regenerate" and an optional note box opens: "Tell the AI what to change, for example 'Mention the auth number on file' or 'Make it shorter'". The note can be up to 500 characters.
2. "Write new draft" runs the F6 generation with the note added to the prompt input. The new draft is a new version. The old versions stay in history.
3. If the biller had unsaved edits, they're asked: "Regenerating replaces your unsaved edits. Save them first?" with "Save and regenerate", "Discard and regenerate" and "Cancel".

### Every case

| Case | What happens |
| --- | --- |
| Biller saves without changes | Nothing is stored. "No changes to save." |
| Biller clears the whole letter | Saved as a version, and the rules check fails "Required parts present". |
| Edit fails to save (network) | Text stays in the editor with "Couldn't save. Your text is still here. Try again." Also kept in local draft storage so a refresh doesn't lose it. |
| Edits on two tabs | Saving checks the version the edit started from. If a newer version exists: "This draft changed in another tab. Reload to see the latest, or save yours as a new version." |
| Regenerate hits the LLM failure cases | Same handling as F6; the current version stays on screen. |
| More than 10 versions | All are kept. The panel shows the latest; history lists the rest. |

### Acceptance criteria

- No edit or regeneration ever overwrites a Draft row.
- Every saved version gets its own rules check.
- The note is stored on the version it produced.

---

## 9. Decision: approve, reject, write off

### What it is for

The biller makes the call. This is the only way a denial moves toward leaving the app.

### Where

The decision bar at the bottom of the denial page, always visible on scroll.

### Buttons and flows

**Approve** (needs the latest draft version with no failing checks; if there are warnings, the "I've reviewed the warnings" box must be ticked)

1. The biller clicks "Approve".
2. The server action re-checks that the latest version has passed (never trust the button state), records the approved version id and the time, sets status to `approved`, and writes `AuditEvent(action = "approved", draft_version = n)`.
3. The timer for this denial stops (F12).
4. The page shows "Approved. Export it, then mark it as submitted once you've sent it." Export buttons (F10) appear, along with "Next denial".

**Reject draft**

1. The biller clicks "Reject draft" and must pick a reason: "Wrong action", "Wrong facts", "Poor writing", "Policy wrong or missing" or "Other" (with a text box).
2. The server action records the rejection on the draft version, sets status back to `in_review` with no current draft, and writes an audit event.
3. The draft panel offers "Regenerate" with the rejection reason prefilled as the note, or "Write it myself" (an empty editor that saves as a biller version).

Rejection reasons are stored as structured data, because they tell us later where the AI is weak.

**Write off**

1. The biller clicks "Write off" and must pick a reason: "Amount too small to pursue", "No timely filing proof", "Patient responsibility", "Payer won't reverse" or "Other" (with text).
2. A confirmation explains the effect: "This removes $214.00 from your open denials. You can reopen it later."
3. On confirm, status becomes `written_off`, the reason is stored, the timer stops and an audit event is written.

**Reopen** (on closed denials only)

1. "Reopen" asks for a reason in a text box.
2. Status goes back to `in_review` if a draft exists, otherwise to `new`. An audit event records the reopen and the reason.

### Every case

| Case | What happens |
| --- | --- |
| Approve clicked while checks fail | The server refuses: "This draft still has 2 problems. Fix them before approving." |
| Approve clicked on an old version | The server refuses: only the latest version can be approved. |
| Double click on Approve | The second request finds status already `approved` and does nothing. |
| Write off on an `approved` denial | Allowed with confirmation, for example if the biller changes their mind before sending. |
| Network error during a decision | The status doesn't change, and "Couldn't save your decision. Try again." is shown. |

### Acceptance criteria

- Every decision is enforced on the server and recorded with who, what, when, which version and why.
- Approve, reject and write-off reasons are stored as enums plus optional text, not free text alone.
- "Next denial" goes to the next open denial in queue order.

---

## 10. Export

### What it is for

The biller takes the approved work out and sends it to the payer through their usual portal or clearinghouse. Denialdesk never sends anything itself.

### Where

The export panel on an approved denial.

### Flow for an appeal letter

1. The biller clicks "Download PDF" or "Download Word".
2. A server action asks the pipeline to render the approved version. The signature block gets the biller's name and practice details from the workspace settings. The letter uses one clean template with the practice's name at the top.
3. The file downloads with a name like `appeal_CLM12345_2026-11-04.pdf`.
4. An audit event records the export with the format and version.

### Flow for a corrected claim

1. The panel shows the corrected claim as a table of changes: field, original value, corrected value, with a "Copy" button for each value and "Copy all".
2. "Download CSV" exports the same table.
3. A short checklist reminds the biller what to set in their billing system: frequency code 7, the original payer claim control number in the right field, and the changed values.
4. Each copy or download writes an audit event.

### After exporting

The panel shows "Sent it? Mark as submitted" (F11). Exporting does not change the status by itself, because the biller might export and not send.

### Every case

| Case | What happens |
| --- | --- |
| Export on a non-approved denial | Not offered in the UI. The server refuses if called anyway. |
| Rendering fails | "We couldn't create the file. Try again." with an error ID. |
| Practice details missing (address, NPI) | Export still works, and the missing fields are blank in the signature block. The panel warns: "Your practice address isn't set. Add it in settings so letters include it." |
| Biller exports several times | Allowed. Every export is logged. |

### Acceptance criteria

- The exported letter matches the approved version word for word (tested).
- Exported files are generated on demand and not kept on the server longer than needed to send them.
- PDF and Word are both readable by a screen reader (real text, proper headings).

---

## 11. Tracking and outcome matching

### What it is for

The biller sees what happened after sending, and the app learns the result without extra typing.

### Where

The denial page's status area, the queue's status filter, and automatic matching during processing (F3).

### Mark as submitted

1. On an approved denial, the biller clicks "Mark as submitted".
2. A small form asks for the submission date (defaults to today) and the method: "Payer portal", "Clearinghouse", "Fax" or "Mail". There's an optional reference number box.
3. The server action stores these, sets status to `submitted`, and writes an audit event.
4. The denial leaves the default queue view and shows under the "Submitted" filter with "Waiting for payer since Nov 4".

### Automatic outcome matching

1. When a new 835 is processed (F3), before creating denials, each claim is checked against submitted denials by payer and payer claim control number (and the patient control number as a fallback).
2. If a matching claim now shows payment for the denied amount, the denial becomes `paid`, the recovered amount in cents is stored, and an audit event records the source file.
3. If it's denied again, the original becomes `denied_again`. A new denial is created linked to it (`parent_denial_id`, `appeal_level` plus 1) and enters the queue as `new`, with the history of the first attempt visible on its page.
4. If it's paid partly, the status is `paid` with the partial amount, and the remaining amount is shown: "Paid $120.00 of $214.00."
5. The upload result counts these: "14 new denials, 3 appeals paid, 1 denied again."

### Every case

| Case | What happens |
| --- | --- |
| A payment arrives for a denial that was never marked submitted | Match it anyway, set status `paid`, and note in history "Paid before it was marked submitted." |
| Match by patient control number only, with several candidates | Don't guess. Leave all unchanged and show a "Possible match" notice on each one, so the biller can confirm the right one. |
| A reversal (`CLP02 = 22`) on a paid denial | Set status back to `submitted` with a history entry "Payer reversed the payment." |
| Submitted for over 45 days with no outcome | The queue's "Submitted" view shows "No response in 45 days" so the biller can follow up. The 45 is a named constant. |
| Biller marks the wrong denial as submitted | "Reopen" (F9) undoes it, with a reason. |

### Acceptance criteria

- Matching never changes a denial based on an ambiguous match.
- Every automatic change records the 835 it came from.
- The recovered amount is stored in cents and feeds the stats (F12).

---

## 12. Personal stats and the timer

### What it is for

The biller sees their progress, and we get the numbers for the kill test: at least twice as many denials per hour with Denialdesk.

### Where

`/stats`. The timer runs quietly on the denial page.

### The timer

1. The timer starts when the biller opens a denial page, and pauses when the tab is hidden, or after 3 minutes with no mouse, keyboard or scroll activity. It resumes on activity.
2. The browser sends a heartbeat every 30 seconds while active. The server adds active seconds to a `WorkSession` row for that denial. Heartbeats are capped so one heartbeat can never add more than 30 seconds.
3. The timer stops at a decision (approve or write off). Time on a reopened denial is added to the same denial.
4. The minutes per denial = total active time from first open to its final decision.

### Manual mode (baseline for the kill test)

1. In settings, the biller can switch on "Baseline mode" for a set number of denials (for example the next 20).
2. In baseline mode the draft section is hidden. The biller works the denial their usual way outside the app, then records the decision here. The timer runs the same way.
3. Each denial is tagged `mode = "baseline"` or `mode = "assisted"`, so the two can be compared fairly.

### The stats page

- Today: denials decided, minutes per denial, and dollars approved for appeal or resubmission.
- This week and all time: the same numbers, plus dollars recovered (from F11) and the write-off total.
- Baseline vs assisted: minutes per denial and denials per hour in each mode, with how many denials each number is based on. With fewer than 20 denials in either mode, the page says "Not enough data yet."
- Where drafts get rejected: a count of rejection reasons (F9).

### Every case

| Case | What happens |
| --- | --- |
| No decisions yet | "Your stats will show up after your first decision." |
| Biller leaves a denial open overnight | Idle pause means it doesn't count. |
| Heartbeats stop (laptop asleep) | Time stops at the last heartbeat. |
| Denial decided without ever being opened | Not possible from the UI. If data shows it, it's counted with 0 minutes and flagged in logs. |

### Acceptance criteria

- The stats numbers match a hand calculation on a seeded test dataset.
- Baseline and assisted numbers are never mixed.
- The timer never records more than 30 seconds per heartbeat or any time while the tab is hidden.

---

## 13. History (audit trail)

### What it is for

There's a permanent, readable record of everything that happened to each denial. It's needed for trust, for HIPAA, and for working out what went wrong when something does.

### Where

The "History" section at the bottom of every denial page. The same events are stored for logins and uploads.

### What gets recorded

An AuditEvent row is written for every one of these, in the same transaction as the change it records:

`login`, `logout`, `login_failed`, `upload`, `denial_created`, `opened`, `details_confirmed`, `deadline_changed`, `facts_saved`, `action_overridden`, `draft_requested`, `draft_created`, `rules_checked`, `draft_edited`, `draft_rejected`, `approved`, `written_off`, `reopened`, `exported`, `copied`, `submitted`, `outcome_matched`.

Each event has the denial id (if any), user id (or `system` for pipeline events), action, time, the draft version (if any), and a small JSON `details` field (for example old and new deadline, rejection reason). It never holds claim contents or patient details, only references by id.

### Flow

1. The history list shows newest first, in plain words: "Nov 4, 10:12 AM · You approved draft version 3", or "Nov 4, 10:05 AM · Rules check found 2 problems in version 2".
2. Clicking a draft event opens that version read-only, with its rules check.
3. "Show all" expands beyond the latest 20.

### Every case

| Case | What happens |
| --- | --- |
| A write succeeds but the audit insert fails | The whole transaction rolls back. A change without its audit event is never allowed. |
| Someone tries to edit or delete an audit row | The app has no code path for it, and the database user the app connects as has no UPDATE or DELETE permission on that table. |
| Very long history | Paginated by 20. |

### Acceptance criteria

- Every status change in this spec has an audit event with a test that checks it.
- The audit table is append-only at the database permission level.
- No audit `details` field contains a patient name, date of birth or member id (tested with a scanner over synthetic data).

---

## Build order

Build in this order, so each step gives the biller something usable:

1. F1 Login
2. F2 Upload, then F3 processing for 835 files only
3. F4 Queue, then F5 Detail
4. F6 Draft, then F7 Rules check, then F9 Approve and write off
5. F10 Export
6. F13 History (record events from the start of step 2, and build the screen here)
7. F8 Editing and regenerating
8. F11 Tracking and outcome matching
9. F12 Stats and the timer (start recording time from step 3, and build the page here)
10. F3 EOB PDF support, last, because it needs the LLM extraction and `needs_check`

After step 5 a biller can already do the full loop: upload, see the ranked list, get a checked draft, approve and export it. Show it to a real biller at that point, before building the rest.