# 0001: The web app owns the database schema

**Date:** 2026-11-04

## Decision

The Drizzle schema in `apps/web/src/server/db/schema.ts` is the single source of truth. `drizzle-kit generate` writes SQL migrations into `db/migrations/`. The Python pipeline reads and writes the same tables but never defines or migrates them.

## Why

Two schema definitions would drift. Drizzle gives the web app typed queries, and the plain SQL migrations stay readable for anyone, including the pipeline.

## Consequences

- A pipeline change that needs a new column starts with a schema change in the web app.
- Pipeline database models are Pydantic models that mirror the tables they touch.
