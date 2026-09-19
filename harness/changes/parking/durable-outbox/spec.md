# Spec — Durable storage and outbox sync (roadmap slice 5)

WHAT and WHY only.

## Goal

Today "Save" keeps a result in memory and it is lost when the app closes. After this change a saved sheet is written to on-device SQLite together with an outbox record in one transaction; a sync engine sends pending results when possible, survives being killed mid-send, retries with backoff, and never loses or duplicates a result beyond what the backend's idempotency tolerates (ADR 0004, `docs/architecture/offline-sync.md`).

## Non-goals

- No backend contract changes and no API client generation; sending goes through a port. The real HTTP adapter exists but is **off by default** (no demo data is sent to the public server unless explicitly enabled).
- No roster/bundle synchronisation (slice 3), no auth beyond the `X-Teacher-UUID` header, no analytics or export.
- No connectivity-change listener (no NetInfo dependency yet): triggers are after-save, app start/foreground, timers and a manual retry.
- Encryption at rest is not implemented and must not be claimed.

## Assumptions (current server code, commit 796601e — implementation behaviour, not a documented contract)

- `POST /api/v1/submissions/batch-sync` upserts by global `client_submission_uuid`, last write wins, the whole request succeeds or fails (no per-item result). Therefore each submission is sent as its own single-item batch so one bad item cannot poison others.
- `POST /api/v1/submissions` always inserts (not idempotent) and is never used.
- Cell status strings `MATCH`, `MISMATCH`, `EMPTY_MISMATCH`, `EMPTY_MATCH`, `FLAG_OVERRIDDEN_BY_TEACHER` and `teacher_override` `CORRECT`/`WRONG` are used as the server code defines them; the mapping from our verdicts is our assumption (contract-gaps 11).
- `student_id` values come from the demo roster until the backend roster exists (slice 3).

## Acceptance criteria

- [x] **AC1** Saving writes the submission and its outbox row in **one SQLite transaction**; killing the process at any point leaves either both or neither.
- [x] **AC2** Saved results are still there after the app is killed and reopened (checking screen list and counters come from the database).
- [~] **AC3** Outbox states `pending → syncing → synced` and recoverable failure with capped exponential backoff + jitter; after the retry limit the entry becomes `failed` and is shown to the teacher; a manual retry resets it. (unit-tested; the `failed` state and retry button not yet shown on the device)
- [x] **AC4** Start-up recovery: entries left in `syncing` by a killed process return to `pending`.
- [~] **AC5** Each submission carries a stable `client_submission_uuid`; a resend after a lost response does not create a second server-side record (verified against a fake gateway that mimics upsert-by-uuid). (verified against the fake gateway in unit tests only)
- [x] **AC6** Offline class batch: 25 saved sheets with the gateway offline all end up `synced` once it is online, none lost, none duplicated (fake gateway; on the device).
- [x] **AC7** Process-kill test on the device: kill the app while an entry is `syncing`; after restart it is recovered and delivered exactly once server-side.
- [~] **AC8** The sync payload matches the documented submission shape (`docs/contracts/openapi-live-2026-09-19.json`); no image bytes anywhere in the database or payload. (fields compared by hand with the live schema; automated conformance test not added)
- [x] **AC9** Static gates pass; the pure logic (state machine, backoff, payload builder, sync engine) has unit tests.

## Open questions

- Idempotency, re-check and partial-failure semantics are the backend's to confirm (contract-gaps 11–18); this change follows the current server code and records that.
- Whether a permanently rejected submission (HTTP 4xx) should be retried or surfaced only — treated as surfaced (`failed`, no automatic retry) until the backend says otherwise.
