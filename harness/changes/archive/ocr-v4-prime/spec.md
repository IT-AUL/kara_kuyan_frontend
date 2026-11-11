# Spec — OCR v4 Prime Pipeline, Adaptive Mobile Inference & Zero-Touch Top-3 Review

## Goal

Deliver prime handwritten Tatar recognition and a 1.5-minute-per-class teacher checking experience across budget, mid-range, and flagship Android phones by upgrading to the `v4` Multi-Scale OCR model (`tatar_ocr_v4_handwritten39`), porting all 7 stages of the `v3/v4` `BlankOCRScanner` CV pipeline into native Kotlin memory, tuning ONNX Runtime + CameraX for heterogeneous ARM big.LITTLE SoCs, calibrating selective prediction to `τ = 85%`, and introducing Zero-Touch fast-track saving plus 1-tap Top-3 yellow-cell correction.

## Non-goals

- Breaking the Zero-Photo invariant (ADR 0003): no raw camera frames, rectified sheets, or cropped cell images may ever cross into JS, hit disk, or be transmitted over the network.
- Changing backend REST endpoints or database schemas (`https://api.kara-kuyan.it-aul.ru` OpenAPI v1.0.0 remains unchanged).
- Implementing 2FA/RBAC from the undeployed backend `feature/backend-secure-architecture` branch.

## Assumptions

- `tatar_ocr_v4_handwritten39_fp32.onnx` (3.61 MB) and `tatar_ocr_v4_handwritten39_int8.onnx` (0.98 MB) from `DanisGaleev/tatar_ocr@7a5cce4` use the verified 39-class Tatar uppercase order (`Ә` at index 1), input `input` `[N, 1, 64, 64]` normalized to `[-1, 1]`, and output `output` `[N, 39]`.
- Existing printed A4 worksheets continue using `DICT_4X4_50` corner markers `0..3` and row markers `11..18` on the `2100×2970` canvas.

## Acceptance criteria

- [x] **AC1 — Bundled `v4` Models & Checksums:** `models/ocr/` ships `tatar_ocr_v4_handwritten39_fp32.onnx` and `tatar_ocr_v4_handwritten39_int8.onnx` with verified `SHA256SUMS` and `ocr-manifest.json`.
- [x] **AC2 — Native Kotlin CV Parity (`v4` 7-Stage Pipeline):** `SheetPipeline.kt`, `CellPreprocessor.kt`, and `SheetReader.kt` implement 60px padded 3-pass ArUco detection (`CORNER_REFINE_SUBPIX`, `C=7`, `C=12`, `CLAHE`), `estimateAffinePartial2D` similarity fallback, `MORPH_CLOSE` + long-kernel grid snapping (15 name cells, 8–12 dynamic row cells), safe perimeter grid border suppression (`84%` protected core), `4%` (`min 5px`) cell trim, contrast-adaptive ink threshold (`22 / 16 / max(7, 0.32*Δ)`), top-diacritic re-attachment (`<= 22px`), 4-part empty-cell filter (`<35px`, `coreFrac < 0.005`, `Blackhat P98 < 10`, top-band intrusion), `48px` glyph scaling, and geometric `Ё`/`Й` post-filtering.
- [x] **AC3 — Android Multi-Device ML & Camera Performance:** `OrtEngine.kt` and `CameraController.kt` configure `GraphOptimizationLevel.ALL_OPT`, `allow_spinning=0`, adaptive big.LITTLE thread sizing (`CpuTopology`), background session warmup on camera start, automatic `FP32_XNNPACK → INT8_CPU` fallback, and single-JNI-call Y-plane analyzer copying.
- [x] **AC4 — Calibrated `τ = 85%` Selective Prediction & Top-3 Domain Model:** `decision.ts` and `evaluate.ts` flag non-empty cells with `confidence < 0.85` as `'uncertain'`, treat `confidence >= 0.85` mismatches as confirmed student errors without false-alarm review flags, expose `top3` candidates per cell from probabilities (zero pixels in JS), and propagate 1-tap cell corrections into task grading and `buildSubmission` payloads.
- [x] **AC5 — Zero-Touch & 1-Tap Top-3 Review UX:** Matched sheets route straight to `AssessmentResultScreen` with an inline student switcher; sheets with `0` uncertain cells show the green «Всё чисто, 100% распознано» Zero-Touch banner and «Сохранить и следующий лист» 1-tap/swipe flow; uncertain tasks highlight only yellow `< 85%` cells and resolve in 1 tap via Top-3 letter chips (plus `[Пусто]` and a 39-letter Tatar uppercase sheet fallback).
- [x] **AC6 — Quality Gates, Emulator Parity & Release v0.3.0:** All 5 static gates pass (`lint`, `typecheck`, `test`, `check-deps`, `doctor`), native Kotlin compiles cleanly and runs on Android emulators against the 12 real benchmark blanks, UI screens are visually verified on Android, and signed `v0.3.0` APKs are built and published on GitHub Releases.

## Open questions

- Server `GET /api/v1/model/manifest` still advertises `finetuned_uppercase39 (1.0.0)` until backend merges `v3-architecture-training`; non-blocking because the mobile app bundles `v4` offline in APK assets.
