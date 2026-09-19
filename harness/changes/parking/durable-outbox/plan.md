# Plan — Durable storage and outbox sync

## Approach
- **Domain (pure TS, unit-tested):** outbox state machine, backoff with jitter, submission payload builder (from `SheetOutcome` + overrides + student), grade/score helpers.
- **Ports:** `SubmissionStore` (atomic `saveWithOutbox`, queries, state transitions, recovery), `SyncGateway` (`send(payload)` → success / retryable failure / permanent rejection), `Clock`.
- **Application service `SyncEngine`:** one-item batches; picks due entries; transitions with the store; recovery on start; triggers after save, on start/foreground, on a timer and by manual retry; never runs two syncs at once.
- **Adapters:** `expo-sqlite` + `drizzle-orm` (typed schema/queries; hand-written, versioned migrations applied in a transaction — `drizzle-kit`'s Expo flow needs Babel/Metro SQL inlining, judged not worth the config risk; recorded as a deviation), a fake gateway (in-memory upsert-by-uuid, switchable online/offline/slow) and an HTTP gateway (off by default).
- **UI:** the checking screen reads saved sheets and counters from the store (replacing the in-memory `saved` list and the static "Ожидают отправки: 3"), shows sync state per sheet and a retry action for failed ones. A dev-only lab (`karakuyan://ocr-lab`) gets buttons to generate a 25-sheet batch, toggle the fake gateway and inspect the outbox.
- Rejected: TanStack Query for the outbox (ADR 0004); WorkManager/background tasks (out of scope); one bulk request per class (server is all-or-nothing).

## File ownership
| Area | Writer |
|---|---|
| `src/domain/sync/**`, `src/domain/scan/**` (payload/cell details) | Claude |
| `src/ports/**`, `src/adapters/sqlite/**`, `src/adapters/sync/**`, `src/composition.ts` | Claude |
| `src/features/checking/**`, `src/features/ocr-lab/**` | Claude |
| `package.json`, `pnpm-lock.yaml`, `app.json`, `android/**` (generated) | Claude |
| `harness/changes/active/durable-outbox/**`, docs (`STATUS.md`, `CLAUDE.md`, `offline-sync.md`) | Claude |

## Risks
- Native rebuild for `expo-sqlite`; disk space (was tight) → check before installing.
- Jest cannot run `expo-sqlite`: the adapter is verified on the device; logic is tested against in-memory fakes.
- Server semantics may change → isolated in the gateway adapter and recorded in `contract-gaps.md`.
- Clock skew / timers in a killed process → all schedule state is persisted (`next_attempt_at`), never held only in memory.

## Deviations
- `drizzle-kit` not used: migrations are hand-written (`src/adapters/sqlite/migrations.ts`, tracked with `PRAGMA user_version`) and `schema.ts` provides the typed queries. Drizzle's `expo-sqlite` driver is synchronous, so `db.transaction()` is atomic.
- `expo-crypto` added for `randomUUID()` (idempotency key), not in the original plan.
- Dev lab is scripted by deep link (`?run=<key>&n=<nonce>`) because scrolled screens made tap coordinates unreliable.
- The 1-item-per-request rule and the cell-status mapping come from reading the backend source (commit 796601e), not from a documented contract.
