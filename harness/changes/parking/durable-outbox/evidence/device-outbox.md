# Outbox verification on the device — SM-S928B, 2026-09-19 (~19:41–19:47)

Setup: dev client rebuilt with `expo-sqlite` 57.0.3 and `expo-crypto` 57.0.3, `drizzle-orm` 0.45.2. Actions were run by deep link
`karakuyan://ocr-lab?run=<key>&n=<nonce>` (keys: `clear`, `status`, `atomic`, `offline25`, `drain`, `slow`), output read from `adb logcat`
(`ReactNativeJS: [ocr-lab] Outbox: … #k/n: {json}`). The "server" is `FakeGateway` (in memory; upsert by uuid like the current backend code).

| AC | Check | Result |
|---|---|---|
| AC1 atomic save | outbox insert forced to fail (foreign key) after the submission insert | `failedAsExpected: true`, error `FOREIGN KEY constraint failed`; row counts before `{submissions:0, outbox:0}`, after `{0,0}` → the first insert rolled back |
| AC6 offline batch | 25 sheets saved while the gateway is offline | `pending: 25`, 25 gateway calls, each entry `attempts: 1`, `lastError: network unreachable`, next try scheduled ≈ +5 s (±20% jitter); the scheduler kept retrying with backoff while offline |
| AC6 | network back, drain | `synced: 25, pending: 0, failed: 0`; fake server `records: 25, inserted: 25, updated: 0` (no duplicates); every entry `attempts: 4` (3 offline retries + 1 success); 100 gateway calls in total |
| AC2 persistence | `am force-stop` + restart | `synced: 25` still in SQLite (fake server memory reset, as expected) |
| AC4/AC7 kill mid-send | `slow` (30 s send) → entry `syncing`, attempts 1 → `am force-stop` → restart | entry recovered to `pending` and delivered: `synced`, `attempts: 2`; fake server `calls: 1, records: 1, inserted: 1, updated: 0` |
| UI | checking screen after the above | shows the persisted row «Лаборатория 999 · 7/8 · оценка 5 · Отправлено», counter «Ожидают отправки: 0», «19 из 25 проверено» |

Unit tests (Jest, 44 in total at this point): outbox state machine and backoff bounds, recovery, payload builder and cell-status mapping (mirrors the backend `checker.py`), `SyncEngine` (success, backoff while offline, permanent rejection + manual retry, attempt limit, resend after a lost response without a duplicate, 25-sheet batch, no concurrent runs, thrown gateway error).

## Findings
- **Payload size:** one sheet with all cells is **≈ 7.8 KB** of JSON (8 questions × 9 cells), not the 1–2 KB in the docs (whose example lists only some cells); 25 sheets ≈ 195 KB. Ask the backend whether all cells are needed (contract-gaps).
- Status/override mapping follows the backend code (`generators/checker.py`): overrides are per cell; the teacher's per-answer decision is mapped onto the non-matching cells of that answer.
- One request per submission (server is all-or-nothing) and `POST /submissions` is never used (not idempotent).

## Not verified / caveats
- A real scan → «Сохранить» → database path was not driven through the UI after the outbox wiring (the code path exists; the lab helpers enqueue synthetic payloads).
- `failed` state and the «Повторить отправку» button were tested in unit tests only, not shown on the device.
- AC5 (resend without a duplicate) was verified against the fake gateway in unit tests only; the real `HttpGateway` (off by default, enabled only with `EXPO_PUBLIC_SYNC_URL`) has never been called and no data was sent to any server.
- An automated conformance test of the payload against `docs/contracts/openapi-live-2026-09-19.json` was drafted but **not added** (the user interrupted that step); a manual comparison of field names was done: `SubmissionItem`, `SubmissionQuestionResult`, `SubmissionCellResult` fields all match.
- Connectivity-change trigger is not implemented (no NetInfo): triggers are after save, app start/foreground, timers and manual retry.
