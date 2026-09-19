# Spec — P0 camera + runtime spike

WHAT and WHY only. No implementation detail.

## Goal

Retire the two biggest product risks before building the scan → review → save loop: (1) can a phone turn a handwritten worksheet into structured per-cell evidence within 3 seconds, and (2) can that happen with pixels confined to native memory. The spike also decides the camera path and the ONNX runtime lane from device measurements, and defines the typed boundary (`OcrEngine` port + `SheetEvidence`) that the app will later consume.

## Non-goals

- No backend/API client, SQLite, outbox, or sync (slices 3 and 5).
- No wiring into the product screens (`scan`, `processing`, …) and no UI redesign. Any harness UI is dev-only and hidden from teacher navigation. Product wiring is the next change (slice 4).
- No model training or fine-tuning. No claims about model accuracy beyond what our own measurements show.
- QNN/NPU and calibrated static INT8 are out unless CPU lanes miss the budget (then recorded as the next lever, not built here).
- No collection of student images by the app. Any evaluation set is produced offline from consenting volunteers or the team's own handwriting.

## Assumptions

- Reference device: Samsung SM-S928B, SoC `SM8650` (Snapdragon 8 Gen 3), Android 16 / API 36, 8 cores, ~11 GB RAM — **verified via `adb` on 2026-09-19**.
- Model artifacts are the three files in `~/Downloads/iMe Desktop/`; SHA-256 and sizes **verified equal** to `docs/contracts/model-manifest.md` on 2026-09-19.
- NCHW `[N,1,64,64]` input **verified** on the models. The 39-class order in the integration guide is **wrong** (measured; confirmed by the authors' PDF, `docs/contracts/ocr-server-pipeline-reference.md`): `Ә` is index 1. Preprocessing: the authors' source (`blank_pipeline.py` `classify_cell`) is the target and is ported exactly in `tools/ocr-lab/preprocess_server.py`; the older guide is superseded.
- Sheet geometry: taken from the authors' `pdf_blank.py` (corner markers 14 mm at 6 mm; ids 0 TL, 1 TR, 2 BL, 3 BR; QR 18 mm at (23,6); 16-cell name field; question blocks from y=38 mm, pitch 28 mm; 10×10 mm cells at x=22). The offline bundle carries no coordinates; the server hardcodes them. **Verified on the live server's real `blank.pdf`** (2026-09-19, `evidence/real-blank-check.txt`). The live `offline-bundle` endpoint returned HTTP 500 (contract-gaps 21).
- Unverified: VisionCamera v5 compatibility with Expo SDK 57 / RN 0.86; exact ORT and OpenCV Android artifact versions.

## Acceptance criteria

- [ ] **AC1 Model parity:** a Python reference run of FP32 and INT8 on a fixture set of cells produces recorded golden logits; input/output names, shapes and the class order are confirmed against the model files.
- [ ] **AC2 Preprocessing parity:** the Kotlin preprocessing produces tensors matching the reference within a tolerance recorded in the review, on the same fixture cells.
- [ ] **AC3 Runtime benchmark:** on SM-S928B, FP32+XNNPACK vs dynamic INT8 (CPU) for a full-sheet batch, cold and warm, with thread settings recorded, median and p95 over a stated number of runs.
- [ ] **AC4 Geometry + QR:** ArUco detection, rectification and QR decode work on a printed generated sheet; success rate over a stated number of live frames and per-stage timings recorded.
- [ ] **AC5 End-to-end budget:** stable frame → `SheetEvidence` measured cold and warm on device against ≤3 s; if missed, a per-stage breakdown and the next lever are recorded.
- [ ] **AC6 Camera decision:** CameraX-in-module vs VisionCamera v5 compared on the same measurements; decision and rationale recorded in ADR form.
- [ ] **AC7 Zero-photo evidence:** filesystem, network and log checks show no image artifacts after scans; nothing pixel-derived reaches JS; a repeated-scan soak shows no unbounded native memory growth.
- [ ] **AC8 Decision-logic report:** on a hand-filled evaluation set, statuses derived from `p(expected)` (not top-1 alone) are reported as: wrong answers accepted as correct, flagged-for-review rate, and per-confusable-pair behaviour. Thresholds are proposals, not shipped defaults.
- [ ] **AC9 Boundary defined:** `OcrEngine` port and `SheetEvidence` types exist with tests in TypeScript; the native module exposes only that typed surface and has no backend knowledge.
- [ ] **AC10 Docs consistent:** ADR 0005, `ocr-pipeline.md`, `model-manifest.md`, `contract-gaps.md` and `STATUS.md` updated to match measured facts; static gates pass (lint, typecheck, tests, check-deps, doctor).

## Open questions

- **Authors' repo** `github.com/DanisGaleev/tatar_ocr` (no licence): preprocessing and geometry now known from source (`docs/contracts/ocr-server-pipeline-reference.md`); permission to reuse and access to `realdataset/` (real handwriting, evaluation set for AC8) still needed.
- **Live backend** returned 502; retry to compare its OpenAPI with the draft (contract-gaps 19).
- **Sheet geometry** (marker positions/size, answer-row and cell coordinates) is absent from `template_geometry` — backend/product must supply or confirm; the spike uses a documented fixture layout and records the gap.
- **Confidence threshold** (0.65 backend vs 0.8/0.5 guide) — decided by AC8 data plus backend input, not here.
- **Blank-cell handling** — spike tests an ink-fraction pre-filter; final rule is a product/backend decision.
- **Evaluation data:** who provides handwritten sheets, and under what consent? Blocks AC8 quality claims.
- **Model artifact location** for the app (asset vs download+SHA check vs LFS) — spike loads via `adb push`; final packaging deferred.
- Cell-image fixtures containing real student handwriting must not be committed.
