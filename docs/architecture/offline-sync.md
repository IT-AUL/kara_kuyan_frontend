# Offline Sync

## Implementation (2026-09-19, change `durable-outbox`)

`src/domain/sync/outbox.ts` (pure state machine, backoff 5 s × 2ⁿ capped at 15 min, ±20% jitter, 8 attempts), `src/domain/sync/payload.ts` (submission JSON; cell statuses as the backend `checker.py`), `src/features/checking/sync/syncEngine.ts` (one request per submission, persists `syncing` before sending, recovery at start), `src/adapters/sqlite/*` (expo-sqlite + Drizzle, atomic `saveWithOutbox`), `src/adapters/sync/{fake-gateway,http-gateway,scheduler}.ts`, wired in `src/composition.ts`. The HTTP gateway is used only when `EXPO_PUBLIC_SYNC_URL` is set; otherwise a fake in-memory backend is used. Device evidence: `harness/changes/active/durable-outbox/evidence/device-outbox.md`. No connectivity listener yet (triggers: save, start/foreground, timer, manual retry).

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

> Current server code (commit 796601e; `docs/contracts/ocr-server-pipeline-reference.md`): `batch-sync` upserts by global `client_submission_uuid`, last write wins, all-or-nothing request, `POST /submissions` always inserts. This is implementation behaviour, not a documented contract — confirm before relying on it.

- **`client_submission_uuid` idempotency:** whether re-POSTing the same UUID upserts, conflicts, or duplicates is a **backend contract question** (tracked in `docs/contracts/contract-gaps.md`). The client guarantees a stable UUID per submission; dedup semantics must be confirmed.
- **Re-checked sheets:** if a teacher re-checks a worksheet offline, whether the update is a new submission, a revision of the same UUID, or an ordered update is **backend-defined**. Recorded as an open item.
- **Batch partial failure:** per-item accept/reject semantics in `batch-sync` are unspecified; the client must handle a defined per-item outcome shape before shipping.
- **Ordering:** submissions carry `checked_at`; server-side ordering/last-write semantics unconfirmed.

## Invariants to test

- Process kill mid-sync → no loss, no duplicate-after-retry beyond backend-tolerated idempotent resend.
- Airplane-mode full class batch → every sheet lands in the outbox in the same transaction as its result.
- Re-open app offline → review and outbox state intact.
