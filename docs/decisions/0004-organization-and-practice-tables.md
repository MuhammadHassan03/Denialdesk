# 0004: Organization, practice and user tables now

**Date:** 2026-11-04

## Decision

Follow FEATURES.md F1 as written: `create-user` makes an organization (the first time), a practice, and a user with role `biller`. Remittances, payers, denials and audit events carry `organization_id`, and duplicate checks are per organization.

## Why

AGENTS.md says single biller only, with no tables for multi-user features. FEATURES.md F1 asks for organizations, practices and a role. We asked, and the owner chose FEATURES.md. The role enum has one value, `biller`, and there is no screen or code path for a second role, seats or an admin.

## Consequences

- One biller per organization in practice. `create-user` attaches every new biller to the first organization.
- The worker uses the organization's first biller's timezone for "today" when ranking.
