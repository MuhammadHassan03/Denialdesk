# 0009: Drafting pipeline choices

**Date:** 2026-11-13

FEATURES.md F6 leaves the provider and a few data shapes open. These are the readings in `draft/`, `jobs/draft_denial.py` and migration 0004.

- **Provider: Claude through the Anthropic API.** AGENTS.md allows Claude or GPT. Both vendors sign a BAA for API use only with zero data retention arranged on the account, so neither is ahead on compliance. Claude is chosen for one client and one code path; `llm_client.py` stays the only place that knows the provider, so switching later touches one file. New dependency: `anthropic`, the official client, for typed replies and timeouts.
- **Structured output.** The model must answer through one tool whose input schema is the draft shape. The reply is still parsed into the Pydantic model, and a reply in the wrong shape counts as a failed try.
- **Model and prices come from the environment.** `LLM_MODEL` and the two price variables are required for drafting. Prices are not hard-coded because they change; cost is stored in whole cents, rounded up.
- **Call budget.** One draft request makes at most four calls: each ask is tried twice (a failed call, or a wrong shape sent back with the problem), and a draft that fails the rules check is asked for once more with the reasons. Both versions are stored.
- **Where facts live.** The web action saves `biller_facts` and `draft_action` on the denial, sets it to `drafting` and queues the job. Each draft row copies the facts it was written from.
- **One open draft job per denial.** A partial unique index on `jobs.denial_id` for queued and running jobs. Only draft jobs carry a denial id.
- **Failure.** No usable reply, or missing LLM settings, puts the denial back to `new` with `draft_failure_message` and keeps the facts. A job that crashes three times does the same.
- **Policies.** `payer_policies` holds the text drafts may quote, per payer and denial code. The draft gets the newest version of each policy already in effect.
- **NCCI.** `ncci_edits` is empty until edits are loaded. The check only knows the procedure codes on the claim's other denials, because paid lines are not stored yet.
