# Offline Sync

## Ownership

- **expo-sqlite is the durable source of truth** for assessments, submissions, review state, and the outbox. TanStack Query handles remote server state only and is never the unsynced outbox.
- A graded submission and its outbox entry are written in **one atomic SQLite transaction** — a submission can never exist as "saved" without a pending sync record.

## Outbox FSM (conceptual)

```
pending → syncing → synced
   ↑          ↓
   └─── failed (recoverable, back to pending with backoff)
```

- `pending` — written, awaiting connectivity/trigger.
- `syncing` — upload in flight; a process kill during this state must recover to `pending` on next launch (orphaned `syncing` rows are reaped at startup).
- `synced` — server-confirmed; immutable record of the confirmed payload.
- `failed` — bounded retries with exponential backoff + jitter; surfaces to the teacher only after retries exhaust, never silently.

## Retry / connectivity

- Sync triggers: after saving a submission (if online), connectivity restore, manual retry.
- Connectivity checks inform scheduling only; the outbox — not network state — decides what is unsent.
- Backoff is capped; the demo batch (~25 sheets, ~35 KB) is small, so retries are cheap.

## Open semantics — backend decisions, not client inventions

- **`client_submission_uuid` idempotency:** whether re-POSTing the same UUID upserts, conflicts, or duplicates is a **backend contract question** (tracked in `docs/contracts/contract-gaps.md`). The client guarantees a stable UUID per submission; dedup semantics must be confirmed.
- **Re-checked sheets:** if a teacher re-checks a worksheet offline, whether the update is a new submission, a revision of the same UUID, or an ordered update is **backend-defined**. Recorded as an open item.
- **Batch partial failure:** per-item accept/reject semantics in `batch-sync` are unspecified; the client must handle a defined per-item outcome shape before shipping.
- **Ordering:** submissions carry `checked_at`; server-side ordering/last-write semantics unconfirmed.

## Invariants to test

- Process kill mid-sync → no loss, no duplicate-after-retry beyond backend-tolerated idempotent resend.
- Airplane-mode full class batch → every sheet lands in the outbox in the same transaction as its result.
- Re-open app offline → review and outbox state intact.
