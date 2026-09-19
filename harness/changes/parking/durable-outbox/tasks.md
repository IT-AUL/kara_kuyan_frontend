# Tasks — Durable storage and outbox sync

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Domain: outbox FSM, backoff+jitter, payload builder (+ tests) | `src/domain/sync/**`, `src/domain/scan/**` | done (2026-09-19) | `outbox.ts`, `payload.ts` + tests; cells/topic tag added to `EvaluatedTask` |
| 2 | Ports and `SyncEngine` with in-memory fakes (+ tests) | `src/ports/**`, `src/features/checking/sync/**` | done | 8 engine tests; `pnpm test --runInBand`: 44 passed |
| 3 | Install `expo-sqlite`, `drizzle-orm`, `expo-crypto`; schema + migrations + `SqliteStore` | `package.json`, `src/adapters/sqlite/**` | done | typecheck/lint clean; on-device: `evidence/device-outbox.md` |
| 4 | Fake and HTTP gateways (HTTP off by default) | `src/adapters/sync/**` | done | `FakeGateway` used on device; `HttpGateway` written, never called |
| 5 | Wire save → store; checking screen from the store; sync state + retry UI; scheduler | `src/features/checking/**`, `src/adapters/sync/scheduler.ts`, `src/composition.ts`, `app/_layout.tsx` | done (scan → save path not yet driven on device) | screenshot in `evidence/device-outbox.md` |
| 6 | Dev lab: 25-sheet batch, gateway toggle, outbox inspector; scripted by deep link | `src/features/ocr-lab/**` | done | `karakuyan://ocr-lab?run=<key>&n=<nonce>` |
| 7 | Device verification: restart persistence, offline batch, process kill during `syncing` (AC1–AC7) | evidence/ | done | `evidence/device-outbox.md` |
| 8 | Docs: `offline-sync.md`, STATUS, CLAUDE.md, contract-gaps | docs | done (2026-09-19, handoff) | see docs diffs |
| 9 | Independent review | `reviews/review.md` | pending | — |

## Completion definition
- [ ] Every acceptance criterion in spec.md has evidence above.
- [ ] No open question was silently guessed.
- [ ] Review in `reviews/review.md` recorded.
