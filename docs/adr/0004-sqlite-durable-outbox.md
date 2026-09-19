# ADR 0004: SQLite durable outbox

**Status:** Accepted

## Context

Classroom checking must work offline for ~25 sheets and sync reliably afterward. A persisted query cache is not durable domain storage and cannot express outbox semantics.

## Decision

expo-sqlite (+ Drizzle schema/migrations) is the durable source of truth. Submission save and outbox insert happen in one atomic transaction. Outbox FSM: `pending → syncing → synced`, recoverable `failed` with backoff. TanStack Query handles remote server state only — never the unsynced outbox.

## Consequences

- Positive: no lost grades across process kills; clear sync state; simple to reason about.
- Negative: custom sync logic on top of expo-sqlite (Expo provides no sync layer); idempotency/re-check semantics depend on unanswered backend questions (`client_submission_uuid` upsert, ordering, partial failure) — tracked in `docs/contracts/contract-gaps.md`, not invented.
- Detail: `docs/architecture/offline-sync.md`.
