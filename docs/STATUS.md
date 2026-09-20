# Status

## State (updated 2026-09-19)

- Planning foundation, bootstrap, design refresh, Android device polish, Figma alignment: **complete and archived** (see "Completed changes").
- **Scan flow is real** (`harness/changes/parking/scan-check-flow/`, parked; roadmap slice 4): live CameraX preview → auto-capture → on-device recognition (ONNX Runtime + OpenCV in `modules/ocr-native`) → per-task results → teacher review/override → save, running end to end on SM-S928B. Sheets are matched to a known assignment through the QR and rejected when unknown. Evidence: `harness/changes/active/scan-check-flow/evidence/` (`live-scan.md`, `paper-handwriting.md`).
- **Camera/runtime spike** (`harness/changes/parking/p0-camera-runtime-spike/`, parked): inference lane decided by benchmark (FP32 + XNNPACK 6 threads ≈110 ms per 72-cell sheet; ADR 0005), Kotlin preprocessing bit-exact vs the authors' pipeline, geometry + QR on device, backend source and live API reviewed. Remaining there: handwriting calibration (10 calibration sheets and a scoring script are ready, photos pending), network zero-photo audit, review.
- **Durable outbox** (`harness/changes/active/durable-outbox/`, slice 5, active): saved results go to SQLite together with an outbox row in one transaction, a sync engine with backoff and start-up recovery sends them (fake in-memory backend by default; real HTTP gateway only with `EXPO_PUBLIC_SYNC_URL`). Verified on the device: atomic rollback, 25 sheets saved offline then synced with no loss or duplicates, persistence across restart, kill during `syncing` recovered and delivered once (`evidence/device-outbox.md`). Not verified: a real scan → save through the UI after the wiring, the `failed`/retry UI on the device, any call to the real server.
- **Not started:** backend client / offline-bundle store (slice 3), constructor and print (6), analytics and export wiring (7). The assignment catalog is a demo fixture because the live `offline-bundle` returns HTTP 500.
- Static gates on 2026-09-19: lint, typecheck and `pnpm test --runInBand` (44 tests) pass; `check-deps`/`doctor` last passed before `expo-sqlite`, `expo-crypto` and `drizzle-orm` were added — re-run them.

## Available inputs

- Product brief: `docs/product/product-brief.md`
- Backend contract: live spec `docs/contracts/openapi-live-2026-09-19.json` (OpenAPI 3.1, preferred); earlier draft `docs/contracts/openapi.yaml` (3.0.3, superseded) — gaps in `docs/contracts/contract-gaps.md`
- Authors' pipeline and backend source notes: `docs/contracts/ocr-server-pipeline-reference.md` (`github.com/DanisGaleev/tatar_ocr` @796601e)
- Handwriting calibration kit: `tools/sheet-gen/gen_calibration.py`, `tools/ocr-lab/score_photos.py` (photos go to git-ignored `tools/ocr-lab/fixtures-private/photos/`)
- API prose spec: `docs/contracts/api-prose-reference.md`
- OCR integration guide: `docs/contracts/ocr-integration-reference.md`
- Model artifacts: FP32/INT8 ONNX + `.pth` — not committed to the repo; filenames and verified facts recorded in `docs/contracts/model-manifest.md`
- Figma reference: `https://www.figma.com/design/z6hxlS5wVdmPLsMlb2lha7/Кара-Куян?node-id=0-1`
- Initial demo UI evidence: `harness/changes/archive/bootstrap-demo-ui/evidence/`
- Refreshed design evidence: `harness/changes/archive/design-ux-refresh/evidence/`

## Completed changes

| Change | Outcome | Evidence |
|---|---|---|
| `bootstrap-demo-ui` | Expo scaffold, tokenized design system, four tabs, and clickable static demo flow approved | `harness/changes/archive/bootstrap-demo-ui/tasks.md`, `reviews/review.md`, `evidence/` |
| `design-ux-refresh` | Lower-chrome surface system, corrected tab IA, Russian status vocabulary, and review→save flow approved | `harness/changes/archive/design-ux-refresh/tasks.md`, `reviews/review.md`, `evidence/` |
| `android-device-polish` | All 12 core routes verified on Samsung SM-S928B (384×832dp); device gate 48/48 PASS; a11y labels added to MetricTile, Card, AssessmentCard, CharacterCells; static gates all green (lint, typecheck, tests, check-deps, doctor) | `harness/changes/archive/android-device-polish/tasks.md`, `reviews/review.md`, `evidence/after/` |
| `figma-ux-alignment` | Static UI prototype aligned with Figma mockups: SegmentedTabs, SearchBar, BarChart, Analytics grade dynamics & repeat topic insight, Assignments search & CTA, Classes tabs & add student, Home recent activity. Verified on-device (SM-S928B). | `harness/changes/archive/figma-ux-alignment/tasks.md`, `reviews/review.md`, `evidence/` |

| `scan-check-flow` (active) | Real scan → result → review → save loop in the app, verified on SM-S928B; QR-based sheet validation | `harness/changes/active/scan-check-flow/` |
| `p0-camera-runtime-spike` (parked) | Benchmark, parity, geometry/QR, backend review; ADRs 0005 and 0006 | `harness/changes/parking/p0-camera-runtime-spike/` |

## Blocked / open items

- **OpenAPI** — the live server (`tatar-ocr.duckdns.org`) serves a much better spec (`docs/contracts/openapi-live-2026-09-19.json`: operationIds, 4xx, required fields; still no security scheme). Draft `openapi.yaml` is superseded but kept. Codegen not blocked by lint any more; semantic gaps and the offline-bundle 500 remain (`docs/contracts/contract-gaps.md` items 19–22).
- **Backend idempotency / re-check semantics** — `client_submission_uuid` upsert, ordering, partial-failure behavior unconfirmed; must not be invented client-side.
- **Grading mismatch** — 7/8 → grade 4 in API example vs scale that maps 87% → grade 5.
- **Android TalkBack end-to-end** — structural a11y labels added; a TalkBack pass on the real scan → review → save flow is still to do.
- **Decision thresholds** — `proposedThresholds` (p ≥ 0.8, lead ≥ 0.3) are unvalidated; first real sheet: 10/11 letters top-1, none wrongly accepted. Calibration on the 10 sheets pending. Backend `0.65` is only a hardcoded default.
- **QR identity** — QR carries no student id; identity comes from the name field (fuzzy roster match) or the teacher's pick.
- **Zero-photo evidence** — files, gallery and logs checked clean; network capture not yet done.
- **Reference phone details** — Samsung SM-S928B confirmed: Android 16/API 36, 1080×2340 at 450dpi, 384×832dp; SoC `SM8650` (Snapdragon 8 Gen 3), 8 cores, ~11.3 GB RAM (verified via adb 2026-09-19, `harness/changes/active/p0-camera-runtime-spike/evidence/device-and-models.md`). Benchmark done (`evidence/benchmark.md`).
- **Model class order** — guide says `Ә` last; measured models and the authors' pipeline PDF put `Ә` at index 1. Recorded in `docs/architecture/ocr-pipeline.md`; verify on handwriting (`contract-gaps.md` item 17).
- **Backend source obtained** — `github.com/DanisGaleev/tatar_ocr` @796601e read; preprocessing and sheet geometry ported exactly; several gaps clarified (`contract-gaps.md`, `docs/contracts/ocr-server-pipeline-reference.md`). Open: repo has no licence, `realdataset/` (real handwriting) needs the authors' permission, accuracy claims conflict (96.97% vs 94.28%).
- **Live backend** — restored 2026-09-19; `offline-bundle` for `TAT-2026-Q1` returns 500 and `blank.pdf` has 4 questions vs 8 announced (`contract-gaps.md` items 21–22).
- **Sheet geometry / blank cells** — marker position/size, row and cell coordinates absent from the contract; blank-cell rule client-defined (`docs/contracts/contract-gaps.md` items 15–16).
- **Weak auth model** — `X-Teacher-UUID` is bearer-equivalent demo identity; production auth/rotation/revocation is an unresolved backend requirement.
- **OS-level capture** — `FLAG_SECURE` vs demo recording on camera/result surfaces undecided.
- **Model license/version** — not embedded in ONNX metadata; manifest proposed.

## Next recommended action

1. **Close slice 5:** re-run `pnpm run check-deps` and `pnpm run doctor`; drive a real scan → «Сохранить» → checking list on the phone; show the `failed` state and retry button; add the payload-vs-live-schema conformance test (drafted, not added); independent review; the user archives `durable-outbox`.
2. **Finish slice 2 (parked changes):** score the 10 calibration sheets (`tools/ocr-lab/score_photos.py`, photos in `tools/ocr-lab/fixtures-private/photos/`) and set thresholds from data; network capture during a scan; review.
3. **Slice 3** — plan is in `harness/changes/parking/backend-integration/` (phases A–B need no backend answers: HTTP client, identity, real batch-sync smoke; phase C waits for) the backend answers `docs/contracts/contract-gaps.md` items 15–24 and fixes the `offline-bundle` 500.

- Backend request list (what the backend must add for full functionality): `docs/contracts/backend-requests-2026-09-19.md`; front↔back audit: `harness/changes/active/backend-integration/evidence/audit-2026-09-19.md`.
- **Backend wiring (2026-09-19):** all product screens use the live backend via `src/data/*` (cache + network); demo data removed from product code; evidence `harness/changes/active/backend-integration/evidence/wiring-2026-09-19.md`. Not yet exercised on a phone (none connected at the time). `check-deps` and `doctor` pass.
- **Backend spec update (2026-09-19 evening):** new `GET /model/manifest`, handwriting metrics, seeded `offline-bundle` fixed; preprocessing spec conflicts with our port (trim 11/min-ink 35 vs 8/30) → contract-gaps 27, needs a parity check before any change.
- **Home redesign (2026-09-19):** hero «check dial» (glow, count-up, dot per student, one adaptive CTA), quieter dismissible insight (marked preliminary when < 5 works), flat recent list, staggered entrance + pull-to-refresh, reduced-motion aware (`src/design-system/motion.ts`). Built from three read-only role audits (product, UX, UI). Verified on the phone: layout, data, navigation targets unchanged; NOT verified: reduced-motion setting, TalkBack, empty/error/offline/loading states, pull-to-refresh.
- **Tests tab (2026-09-19):** renamed from «Задания»; constructor (draft persisted, tasks from bank/generator/custom, order, cells preview), test page, hero of the current test + task-count cards, local hide (backend has no delete). Verified on the phone: list, test page, hide/unhide; live server accepts custom + generated task ids in a test (see evidence). Not verified on the phone: bank picker, generator and custom-task screens, PDF share from the test page.
- **Constructor UX pass (2026-09-19):** builder reorganised for a phone (name → class/variants steppers → add-tasks tiles/chips on top → dense task cards → sticky summary), bank picker with «select all», generator preselects the first type, custom task with live cell preview and «Ещё» (save + next), footers lift above the keyboard (`Screen avoidKeyboard`). Verified on the phone: builder, generator and custom-task layouts, keyboard lift. Not verified: typing Cyrillic answers end-to-end (adb cannot type it), picker select-all, reorder buttons, creating a test from the UI.
- **Screen roles (2026-09-20):** Home = where am I and the next action (one card, scan CTA, insight, unsent-work notice; no lists); Проверка = the class queue of the current test (every student: checked/not, sync state, filter, scan); Тесты = list + drafts, the current test opens the **test page** (tabs Итоги / Задания / Ученики / Бланк: grades, per-task hits, who is checked with per-task ✓/✕, blank and hide). Students are listed in roster order, never ranked. Pure summaries in `src/domain/tests/summary.ts` (tested). Also added: check a refused sheet anyway (`forceCheck`, warning banners; domain tests; on the phone only the refusal screen with «Всё равно проверить» was seen, not the forced result).
- **Backend update 2 (2026-09-20):** new assign-test-to-class, class assignment list with progress, batch blanks for a class, `GET /assignments`. Wired: new tests are auto-assigned to the active class; Tests list groups «Назначено классу» / «Другие»; test page shows/assigns the class and prints «Бланки на весь класс». Isolation by teacher still missing (contract-gaps 30). Live suite 6/6 (with `LIVE_WRITE=1`, which also creates probe tasks/tests: run it only deliberately).
- **New endpoints wired (2026-09-20):** class assignments (`GET/POST /classes/{id}/assignments`) drive the Tests list (default view «Класса 7-А · N», then «Все», «Скрытые»; server progress and due date on cards, local progress for the current test), the test page (assigned pill, due date, «Назначить классу…», «Бланки на весь класс»), auto-assign on create and on the first saved sheet of an unassigned test. Verified on the phone: assign button → pill, default class view + chips. Not verified: batch PDF share, progress numbers of non-current tests, due date (none exists), first-sheet auto-assign.
- **Tasks from a textbook photo (2026-09-20, ADR 0009):** «Из фото» in the test builder → consent notice → camera/gallery → native multipart upload to `POST /constructor/scan-task` (file deleted after) → review list with editable answers → approved tasks are created with `createTask` and added to the draft. Student sheets still never leave the phone. Status: see the evidence line below once verified on the phone.

