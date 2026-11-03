# 0005: Audit events are append-only in the database

**Date:** 2026-11-04

## Decision

Migration `0003_audit_events_append_only.sql` adds a trigger that raises an error on any UPDATE or DELETE of `audit_events`. The app has no code path that updates or deletes them.

## Why

FEATURES.md F13 asks for append-only at the database permission level. A trigger works whatever role the app connects as, including in development where the app connects as the table owner.

## Still to do at deploy

Create a separate app role and run `REVOKE UPDATE, DELETE ON audit_events FROM <app_role>`. Role names are deployment settings, so this isn't in a migration.
