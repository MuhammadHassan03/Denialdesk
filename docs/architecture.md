# Architecture

## Pieces

```
Biller's browser
      │
      ▼
apps/web (Next.js)
  ├─ pages and components: display only
  ├─ server/actions: approve, reject, write off, export
  ├─ server/db: Drizzle schema and queries ──────────┐
  └─ server/pipeline.ts ── HTTP ──┐                  │
                                  ▼                  ▼
                   services/pipeline (FastAPI)    Postgres
                     ├─ api.py                       ▲
                     └─ jobs/ worker ── polls jobs ──┘
```

## Flow of one denial

1. **Upload.** The web app stores the file, writes an `uploads` row and queues a `jobs` row.
2. **Intake.** The worker picks up the job. `intake/x12_835.py` parses 835s and `intake/eob_pdf.py` reads EOB PDFs through Docling.
3. **Normalize.** `normalize/` turns raw payments into one `Denial` record per denied claim or line.
4. **Rank.** `rank/` scores each denial by dollars at stake and days to its appeal deadline.
5. **Draft.** `draft/` builds a corrected claim or appeal letter through `llm_client.py` using a versioned prompt.
6. **Check.** `rules/` checks every draft against stored payer policy and NCCI. Pass or fail, the result is stored with the draft.
7. **Review.** The biller edits, regenerates, approves, rejects or writes off. Every step is a `denial_events` row.
8. **Export.** Only approved drafts export, as PDF or DOCX, or as fields to copy.
9. **Outcome.** The next 835 is matched back to submitted denials to close them out.

## Where state lives

- **Postgres** holds all records. Background work is a `jobs` table, not a queue service.
- **Drafts are append-only.** Edits and regenerations insert a new version.
- **History is append-only.** `denial_events` is the audit trail for every decision.
