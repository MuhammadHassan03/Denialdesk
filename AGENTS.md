# AGENTS.md

Read this file before you change anything in this repo. It tells you what we are building, where code goes, how it should look, and what you must never do.

## What this is

Denialdesk is a copilot for US medical billers. A biller uploads 835 remittance files and EOB PDFs. Denialdesk pulls out every denial, ranks the denials by dollars at stake and days left, suggests fix, appeal or write off, and drafts the corrected claim or the appeal letter. The biller reviews the draft, approves it and exports it. Nothing leaves the app without the biller's approval.

## Scope right now: the biller only

We are building only what one biller needs. If a task touches anything outside this list, stop and ask.

In scope:

1. Upload 835 files and EOB PDFs (digital and scanned)
2. Parse every denial into one record: claim number, payer name, CARC/RARC codes, amount, appeal deadline
3. Ranked work queue, with filters (code, payer, deadline window, status) and a warning for anything due within 7 days
4. Denial detail: a plain-English meaning for each code, the suggested action with its reason, and the payer policy text with its source
5. AI draft (corrected claim fields or an appeal letter), shown with its rules check result
6. Inline editing, and regenerate with a note from the biller
7. Approve, reject with a reason, or write off
8. Export the approved work: the appeal as PDF or DOCX, and the corrected fields to copy
9. Status tracking, "mark as submitted", and automatic matching of outcomes from the next 835
10. Personal stats: denials cleared and minutes per denial
11. Full history per denial: every draft version, edit and decision
12. Single-biller login and encrypted storage

Out of scope for now, so don't build it, stub it or add tables for it:

- Owner dashboards, seats, billing or plans
- Admin panels or multi-user roles
- Any direct connection to a payer, clearinghouse or payer portal (no Playwright portal steps)
- Automatic submission of anything

The first denial codes we support are CO-197, CO-50, CO-4, CO-16 and CO-29. Any other code is shown with its meaning and the action "review manually".

## Stack

- Web app: Next.js (App Router) with TypeScript in strict mode, Tailwind CSS
- Database: Postgres, with Drizzle ORM and SQL migrations
- Pipeline: Python 3.12, FastAPI for the internal API, Pydantic for all models
- PDF reading: Docling (its default backend uses docling-parse and pypdfium2). OCR is on for scanned EOBs.
- 835 parsing: our own X12 parser. Docling is never used for 835 files.
- LLM: Claude or GPT, called only through `services/pipeline/.../draft/llm_client.py`
- Background jobs: a `jobs` table in Postgres polled by the pipeline worker. No Redis or queue service until we need it.
- Package managers: pnpm for TypeScript, uv for Python

## Folder structure

```
denialdesk/
├── AGENTS.md
├── README.md
├── apps/
│   └── web/                        Next.js app: everything the biller sees
│       └── src/
│           ├── app/
│           │   ├── (auth)/login/
│           │   ├── upload/         upload 835 and EOB files
│           │   ├── queue/          ranked work queue
│           │   ├── denials/[id]/   one denial: reasons, draft, decision
│           │   └── stats/          personal stats
│           ├── components/
│           │   ├── ui/             buttons, inputs, badges (no business logic)
│           │   └── denial/         queue rows, draft editor, rules result
│           ├── server/             server-only code, never imported by client components
│           │   ├── db/
│           │   │   ├── schema.ts
│           │   │   └── queries/    one file per table: denials.ts, drafts.ts ...
│           │   ├── actions/        server actions: approve, reject, write-off, export
│           │   └── pipeline.ts     the only place that calls the Python API
│           └── lib/                pure helpers: money, dates, formatting
├── services/
│   └── pipeline/                   Python: parsing, ranking, drafting, checking
│       ├── src/denialdesk_pipeline/
│       │   ├── intake/
│       │   │   ├── x12_835.py      835 to raw claim payments
│       │   │   └── eob_pdf.py      EOB PDF to text and tables, via Docling
│       │   ├── normalize/          raw data to Denial records
│       │   ├── codes/              CARC/RARC meanings (data file + loader)
│       │   ├── rank/               priority score: dollars and days left
│       │   ├── draft/
│       │   │   ├── llm_client.py   the only file that talks to an LLM
│       │   │   └── prompts/        versioned prompt files, one per action
│       │   ├── rules/              deterministic checks against payer policy and NCCI
│       │   ├── jobs/               worker loop that picks jobs from Postgres
│       │   └── api.py              FastAPI routes the web app calls
│       └── tests/
├── db/
│   └── migrations/                 SQL migrations, never edited after merge
├── fixtures/
│   └── synthetic/                  fake 835s and EOBs. No real patient data, ever.
└── docs/
    ├── architecture.md
    └── decisions/                  one short file per decision (ADR)
```

Rules for placing code:

- Business logic lives in the pipeline or in `apps/web/src/server`. React components only display data and call actions.
- `lib/` holds pure functions only: no database, no network, no environment variables.
- One concept per file. If a file passes about 300 lines, split it by concept, not by line count.
- Tests sit next to the code they test in the web app (`denials.test.ts`) and in `services/pipeline/tests/` for Python, mirroring the source folders.
- Don't create new top-level folders without asking.

## Coding style

General:

- Names say what the thing is in billing language: `appealDeadline`, `carcCode`, `amountCents`. Avoid `data`, `info`, `item`, `handler2`.
- Money is always an integer number of cents (`amountCents: number`, `amount_cents: int`). Never use floats for money.
- Deadlines are dates without times (`YYYY-MM-DD`). Timestamps are UTC and stored as `timestamptz`.
- Validate every boundary: uploads, API requests, LLM output and database rows coming back. Use Zod in TypeScript and Pydantic in Python.
- Return early instead of nesting. Two levels of indentation inside a function is normal; four is a sign to split it.
- Comments explain why, not what. If you need a comment to explain what, rename things until you don't.
- Write errors for the biller in plain words ("This file isn't an 835. It looks like an 837.") and log details for us separately.

TypeScript:

- `strict: true`. No `any`, no `@ts-ignore`, no non-null `!` unless the line above proves the value exists.
- Named exports only. No default exports except where Next.js requires them (pages, layouts).
- Server Components by default. Add `"use client"` only for interaction, and keep those components small.
- Mutations go through server actions in `server/actions/`, never through fetch calls from components.
- Formatting comes from Prettier and lint from ESLint. Don't argue with them in code.

Python:

- Type hints on every function. `mypy --strict` and `ruff` must pass.
- Pydantic models for everything that crosses a boundary. Plain dataclasses are fine inside a module.
- Functions in `rank/`, `rules/`, `normalize/` and `codes/` are pure: same input, same output, no I/O.
- I/O (files, database, LLM) lives at the edges: `intake/`, `jobs/`, `draft/llm_client.py`, `api.py`.

## No clever code

This code handles people's money and health records. Somebody tired at 2am must be able to read it, so boring wins.

1. Write the obvious version first. Make it faster only when a measurement says it is slow.
2. No abstraction until the third copy. Two similar blocks of code are fine.
3. No metaprogramming: no decorators that change behavior, no dynamic imports, no `getattr` tricks, no proxies, no code generation at runtime.
4. No long chains. If a `.map().filter().reduce()` or a comprehension doesn't fit on one readable line, use a plain loop with named variables.
5. No nested ternaries. Use `if` statements.
6. No clever types. Avoid conditional types, deep generics and type gymnastics. If a type needs a comment to explain, simplify it.
7. No regex where a split or a parser is clearer. X12 is parsed by splitting on its separators, segment by segment.
8. No hidden control flow: no exceptions used for normal branching, no global state, no singletons except the database pool and the LLM client.
9. No magic numbers. Name them: `DEADLINE_WARNING_DAYS = 7`.
10. One way to do each thing. If the repo already has a helper for dates, money or errors, use it instead of adding a second one.
11. No new dependency without a one-line reason in the pull request, and never for something the standard library does in under 20 lines.
12. Readable beats short. When in doubt, add a well-named variable.

## Rules for AI and medical data

These are not style. Breaking one is a bug.

- The AI never submits, sends or exports anything by itself. Every outgoing document needs an explicit biller approval stored in the history.
- Every draft goes through `rules/` before the biller sees it. A draft that fails is stored with its reasons, never silently dropped or shown as passed.
- LLM output is parsed into a Pydantic model. If parsing fails, the draft fails. Never use raw model text where a structured field is expected.
- A draft may only quote policy text that exists in our stored `PayerPolicy` records. If the model cites something we don't have, the rules check fails it.
- Prompts live in `draft/prompts/` as versioned files. Each draft records the prompt version and model name it used.
- Drafts are never overwritten. A regenerated or edited draft is a new version.
- No real patient data in the repo, in fixtures, in tests, in logs or in error messages. Use `fixtures/synthetic/` only.
- Logs carry IDs (`denial_id`), never names, dates of birth, member IDs or claim contents.
- Until a BAA is signed with the LLM provider and the host, the app runs on synthetic or de-identified data only.

## Testing

- Every parser, every rule and the ranking function have unit tests against the synthetic fixtures.
- Each supported denial code (CO-197, CO-50, CO-4, CO-16, CO-29) has at least one end-to-end test: upload, rank, draft (with a recorded LLM response), rules check, approve, export.
- Tests never call a real LLM. Use recorded responses stored next to the test.
- A bug fix starts with a failing test that shows the bug.

## Commands

```
pnpm install            # web dependencies
pnpm dev                # web app on localhost:3000
pnpm test               # web tests
pnpm lint && pnpm typecheck

uv sync                 # pipeline dependencies (run in services/pipeline)
uv run pytest
uv run ruff check . && uv run mypy --strict src
uv run fastapi dev src/denialdesk_pipeline/api.py
```

Run lint, type checks and tests before you say a task is done. If one fails, the task isn't done.

## How to work in this repo

- Read the files you're about to change, plus their tests, before editing.
- Keep changes small and focused on the task. Don't reformat or rename unrelated code.
- Database changes go in a new migration. Never edit a migration that has been merged.
- When a decision isn't obvious (a library, a data shape, a trade-off), write a short note in `docs/decisions/`.
- Commits use `engineermirzahassan@gmail.com` as the author email. Commit messages are short and in plain English, with no AI attribution, co-author lines or session links.
- If the steps you were given are not the right track (they break a rule here, go outside the biller scope, or there is a simpler way), stop, explain why, and name the better track before writing code.