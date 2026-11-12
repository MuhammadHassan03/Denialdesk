# 0008: How the rules check reads the less obvious cases

**Date:** 2026-11-13

FEATURES.md F7 lists the checks but leaves their inputs open. These are the readings in `rules/` and `draft/models.py`.

- **Built before drafting (F6).** The checks are pure and depend only on the draft shape, so the shape and the checks come first. The LLM client, prompts, tables and screens arrive with F6 and call `check_draft`.
- **Draft shape.** `AppealLetter` and `CorrectedClaim` in `draft/models.py`, with unknown fields forbidden. `check_draft` takes the raw output, so a draft in the wrong shape gets one failed "Schema valid" check and nothing else runs.
- **Facts respected.** Prose can't be checked for contradictions deterministically. Every draft carries `stated_facts`, the biller's answers it relied on, and the check compares them with the biller's facts key by key. A missing or different answer fails. Two concrete checks sit on top: an appeal for an obtained authorization must contain the authorization number, and a modifier change must equal the modifier the biller chose.
- **Quotes are real.** Any text in straight or curly double quotes in the summary, argument or requested outcome, plus each citation's `quote`, must appear word for word in a policy the letter cites. Only whitespace is normalized.
- **Placeholders.** Square brackets holding only capitals (`[NAME]`), the words `TBD` and `XXX`, and `{{` fail. `[BILLER NAME]` is allowed in the sign-off block only.
- **Changes are justified.** `rules/allowed_changes.py` lists the fields each code may change. A code not listed there (CO-50, CO-29) can't have a corrected claim.
- **Modifier list.** `rules/allowed_modifiers.py` is a starter list of common modifiers. It should be replaced by a reviewed list before a real biller relies on it.
- **NCCI.** The check receives the stored edits as input. An edit that allows a modifier passes only when the line carries one of the bypass modifiers after the draft's changes.
- **Crashed check.** The runner catches the error, returns a fail marked `crashed`, and leaves logging to the caller so `rules/` stays free of I/O.
