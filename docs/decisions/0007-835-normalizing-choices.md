# 0007: How the 835 normalizer reads the less obvious cases

**Date:** 2026-11-04

FEATURES.md F3 leaves a few cases open. These are the readings in `normalize/denials.py` and `jobs/process_remittance.py`.

- **Unique denial.** FEATURES.md names `(payer_id, payer_claim_control_number, reason_code, service_line_ref)`. We store the group code (`CO`) and CARC (`197`) separately, so the unique key includes both.
- **One denial per claim per reason, per line.** Claim-level adjustments use `service_line_ref = "claim"`. Line-level ones use the line's `REF*6R`, or `line-N` when the payer sends none. The same reason on two lines gives two denials, matching the unique key.
- **Denied claims (`CLP02 = 4`).** Every adjustment not in `codes/not_denials.py` counts, including patient-responsibility groups. On other claims only `CO`, `OA` and `PI` count.
- **Zero or negative totals.** A reason whose amounts add up to zero or less is not a denial.
- **Reversals (`CLP02 = 22`).** Counted in `reversals_seen` and skipped. Storing them for outcome matching arrives with F11.
- **No payment date (`BPR16` empty).** Today is used, the deadline is marked estimated, and the upload finishes with a warning.
- **EOB PDFs.** The job fails with a plain message until F3's EOB support (build order step 10).
