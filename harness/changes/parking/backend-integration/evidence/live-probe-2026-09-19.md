# Live backend probe — 2026-09-19

Host `https://tatar-ocr.duckdns.org`. Test teacher UUID `00000000-0000-4000-8000-00000000c0de` (self-registered by the first request).

## Findings
| Call | Result |
|---|---|
| `GET /health` | 200 |
| `GET /assignments/TAT-2026-Q1` (seeded) | 200 (2 variants) |
| `GET /assignments/TAT-2026-Q1/offline-bundle` (seeded) | **500** (gap 21) |
| `POST /constructor/tests` `{title, grade_level:7, generate_variants_count:1}` | 201, body is a full **OfflineBundle** (assignment `TAT-2026-Q1DAB`, 8 questions, `qr_signature`, `expected_cells`) |
| `GET /assignments/TAT-2026-Q1DAB/offline-bundle?variant=1` | **200**, 6.6 KB — the 500 is specific to the seeded assignment |
| `GET /assignments/TAT-2026-Q1DAB/blank.pdf?variant=1` | 200, `application/pdf`, 74 KB |
| `GET /constructor/tasks`, `/constructor/task-types`, `/constructor/ready-tests` | 200; bank items carry prompt, expected answer, cell count, topic |
| `GET /classes` (new teacher) | 200 `{"classes":[]}` |
| `POST /classes/KK-PROBE/students/bulk-import` `{"raw_text":"…"}` | 201, **creates the class implicitly**; `GET /classes` then lists it |
| `GET /analytics/assignments/TAT-2026-Q1DAB` | 200 (0 submissions) |
| `GET /reports/assignments/…/gradebook.xlsx` | 422 (needs parameters, not yet explored) |
| one transient `502` (nginx) between calls | server flaps → outbox retry path is required, not optional |

## Consequence
The app can run the whole loop against the current backend without waiting for a fix: create the assignment through the constructor (the answer is the bundle), print `blank.pdf`, import a roster (creates the class), scan, sync. Only the seeded `TAT-2026-Q1` bundle stays broken.

## Not done
The opt-in live contract test (`src/adapters/api/live.contract.test.ts`, batch-sync insert → resend → update) was not created: the environment blocked the write to the shared backend. Awaiting the user's explicit go-ahead.

## Live contract test (run 2026-09-19, user authorised writes)
`LIVE_API_URL=https://tatar-ocr.duckdns.org pnpm exec jest src/adapters/api/live --runInBand` → 3 passed:
- bundle + roster parse with our guards;
- `buildSubmission` payload accepted by `POST /submissions/batch-sync` (first send inserted/updated 1); **resend of the same `client_submission_uuid` → `updated_count 1`, no duplicate** (gap 11 idempotency confirmed);
- malformed request (`synced_at` invalid) → 422 → `rejected` (no retry).
Read back: `GET /analytics/assignments/TAT-2026-Q1DAB` → `total_submissions 1`, `average_score_pct 100`; `GET /submissions?assignment_id=…` returns the row with our uuid and per-cell results. Tasks 5–8 done; payload conformance (task 6) covered by the live server accepting it.
Note: jest-expo stubs global `fetch`; the live test uses `node:https`. Written rows: teacher `…c0de`, assignment `TAT-2026-Q1DAB`, class `KK-PROBE`, submission `kk-live-contract-0001`.

Caveat: the 3-pass run above was made before a typing-only refactor of the test's `node:https` helper (for `tsc`). Right after it the server returned **502 on every request for >15 s** (`/health` too), so the final file has not been re-run green against the live server yet; `typecheck`, `lint` and the 48 default tests pass. Re-run when the host is back.

## Constructor write path (run 2026-09-19 late, `LIVE_WRITE=1`)
`createTask` (custom, 5-letter answer in 6 cells) → 201 `tsk_fda3ac71`; `generateTasks` (`plural_affixes`, count 2, `save_to_bank: true`) → `tsk_cd119ad4` КУЯННАР, `tsk_e292edb2` ТАКТАЛАР; `assembleTest` with those three ids → bundle `TAT-2026-Q107F` with exactly 3 questions in the given order (КИТАП, КУЯННАР, ТАКТАЛАР). So ids from the generator and the custom-task endpoint are accepted by the test assembler. Left on the server (no delete endpoint): those 3 tasks and the test «KK constructor probe». Not exercised: `custom_stems`, the phone UI for these screens.
