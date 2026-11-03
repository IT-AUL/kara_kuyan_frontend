# Backend update check — 2026-11-03

Backend branch `DanisGaleev/tatar_ocr@cleanup/remove-unused-files` (`1667356`, 4 commits over `main@8286865`, 2026-10-18…31).
Live server `https://tatar-ocr.duckdns.org` serves it (OCR routes gone, see below). Spec snapshot: `docs/contracts/openapi-live-2026-11-03.json`
(SHA-256 `e10abe41…c6dc`), diffed against `openapi-live-2026-09-20.json`.

## API diff (live spec)

- **Removed (5):** `POST /api/v1/ocr/scan-blank`, `/api/v1/ocr/scan-blank-upload`, `/api/v1/ocr/predict-box`, legacy `/api/scan_blank`, `/api/predict_box` + 9 schemas. Live `POST /api/v1/ocr/scan-blank` → 404. Also removed (not in schema): web dashboard `/`, `/ui`.
- **Added:** none. **Changed operations/schemas:** none. Still no security scheme.
- App usage: none of the removed paths are referenced in `src/`, `app/`, `modules/`. All 21 paths the app calls exist with the same methods (script check against the new spec).

## Behaviour changes in the backend source (not visible in the spec)

| Change | Effect on the app |
|---|---|
| `POST /submissions` (single) now upserts by `client_submission_uuid` | Matches what `batch-sync` already did; app uses `batch-sync`. No change. |
| `POST /constructor/tasks`: non-Tatar answer → **422** (was 500); digit-only answers accepted | App maps 422 to a final, non-retryable error and shows the server text. Client-side validation still limits answers to the model alphabet (39 letters, no digits) — correct, the recogniser cannot read digits. No change. |
| `GET /constructor/tasks?scope=my_tasks` filters `task_type == "custom"` | App does not send `scope`. No change. |
| Generators deduplicated; 24 task types listed live | App reads `/constructor/task-types` dynamically; `plural_affixes` still exists. No change. |
| PDFs rendered in a thread pool; font resolution fixed for Linux | Blank 1.6 s, class batch 4.3 s, both valid `%PDF`. |
| **Database was reset on deploy** (seed only: `TAT-2026-Q1`, `cls_7a_2026`, created 2026-10-31) | Old probe fixtures (`TAT-2026-Q1DAB`, `KK-PROBE`) were gone → old live suite failed 3/6 on missing data, not on parsing. Any device that cached old ids will see 404s for them. |

## Adaptation

`src/adapters/api/live.contract.test.ts` rewritten to provision its own data (no fixture ids assumed) and to cover the
full teacher scenario. Read-only by default; `LIVE_WRITE=1` writes a probe class (`KK-PROBE`, created once), a custom
task, two generated tasks, one test assigned to the class and one submission (upsert).

## Verification

```
LIVE_API_URL=https://tatar-ocr.duckdns.org LIVE_WRITE=1 jest --runInBand src/adapters/api/live
  ✓ parses every read endpoint the screens use
  ✓ rejects a malformed request as final (4xx), not retryable
    ✓ creates the probe class once and shows it only to its teacher
    ✓ refuses a custom answer outside the alphabet as final 422, not a retryable 500
    ✓ creates a custom task, generates tasks and assembles a test from them
    ✓ assigns the test to the class and serves its bundle
    ✓ prints a blank and the class batch of blanks as PDF
    ✓ accepts our submission payload and treats a resend as an update
    ✓ shows the saved work in progress, analytics and the gradebook export
Tests: 9 passed, 9 total

tsc --noEmit                         exit 0
jest --runInBand                     13 passed, 1 skipped suites; 80 passed, 9 skipped tests
eslint src app modules               exit 0
```

Not green, unrelated to the backend:
- ~~`expo install --check` / `expo-doctor`: Expo patch releases~~ — **fixed the same day** with `expo install --fix` (user request): 11 SDK-57 patch bumps (`expo` 57.0.24 → ~57.0.31, `expo-router` → ~57.0.29, `expo-sqlite` → ~57.0.4, `jest-expo` → 57.0.6, …), `pnpm-lock.yaml` updated, no second lockfile. After it, via `pnpm run`: typecheck 0, lint 0, test 80 passed / 9 skipped, check-deps «Dependencies are up to date», doctor «21/21 checks passed», live `LIVE_WRITE=1` 9/9. **Native code changed in these packages → a new dev/release APK is needed before device testing.**
- `eslint .` (whole repo): `scripts/branding/generate-icons.mjs` imports `@resvg/resvg-js`, which is not a dependency.
- `pnpm run lint|check-deps|doctor` via the global Corepack shim fail locally: Corepack expects `pnpm.cjs`, pnpm 12 ships `pnpm.mjs`. Ran the binaries from `node_modules/.bin` instead.

## Still open

- **Gap 30 (isolation):** `GET /classes` is scoped by teacher, but a stranger UUID still gets `200` for `GET /classes/KK-PROBE/students` and sees rows from `GET /submissions?class_id=KK-PROBE` (checked 2026-11-03).
- **Gap 27 (preprocessing):** manifest still says trim 11 % / ink 35 px; our port uses 8 % / 30. The backend branch's `blank_pipeline.py` uses 11 / 35 as well → parity check needed before changing the Kotlin port.
- `scan-task` (ADR 0009) answers (422 without a file); end-to-end with a real photo not run here.
- Device run (scan → save on a phone) not done: no device connected (`adb devices` empty).
