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
