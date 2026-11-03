# Denialdesk pipeline

Python service that parses remittances, ranks denials, drafts fixes and checks them.

```
uv sync
uv run pytest
uv run ruff check . && uv run mypy --strict src
uv run fastapi dev src/denialdesk_pipeline/api.py
```

Pure code (no I/O): `normalize/`, `codes/` lookups, `rank/`, `rules/`.
I/O at the edges: `intake/`, `jobs/`, `draft/llm_client.py`, `api.py`.

Prompts live in `draft/prompts/` as `<action>.v<N>.md`, for example `appeal_letter.v1.md`.
A prompt file is never edited after it has been used for a draft. Change it by adding the next version.
