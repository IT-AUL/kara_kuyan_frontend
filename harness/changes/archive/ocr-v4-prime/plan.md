# Plan — OCR v4 Prime Pipeline, Adaptive Mobile Inference & Zero-Touch Top-3 Review

## Approach

1. **Architecture & Model Assets (`ADR 0005`, `models/ocr/`, `ocr-manifest.json`)**:
   - Amend ADR 0005 and `docs/architecture/ocr-pipeline.md` to record `v4` (`TatarOCRNetV3_MultiScale`), adaptive big-core threading, background warmup, and `4% / 48px` preprocessing parameters.
   - Replace `v1` ONNX weights in `models/ocr/` with `tatar_ocr_v4_handwritten39_fp32.onnx` and `tatar_ocr_v4_handwritten39_int8.onnx` and update `SHA256SUMS` + `ocr-manifest.json`.
2. **Native Kotlin CV + ML Runtime (`modules/ocr-native`)**:
   - Add `CpuTopology.kt` reading `/sys/devices/system/cpu/cpu*/cpufreq/cpuinfo_max_freq` to count big/Prime cores (`2..4`) so budget `2+6` phones never spill XNNPACK threads onto slow LITTLE cores.
   - Enhance `OrtEngine.kt` with `GraphOptimizationLevel.ALL_OPT`, `setMemoryPatternOptimization(true)`, `warmup()`, and output tensor index access (`result[0]`, compatible with `output` tensor name in `v4`).
   - Enhance `CameraController.kt` with reusable single-JNI-call Y-plane extraction in `analyze()`, async engine warmup on `start()`, `FP32_XNNPACK` primary with `INT8 + CPU` fallback, and `"marker-similarity"` acceptance.
   - Port full `v4` geometry and border suppression into `SheetPipeline.kt` (`detectMarkersPadded`, `CORNER_REFINE_SUBPIX` on stills, 3-pass ArUco, `estimateAffinePartial2D`, `MORPH_CLOSE` grid snapping, 15 name cells, 8–12 question cells, `suppressGridBorders` with 84% safe core).
   - Port full `v4` cell segmentation into `CellPreprocessor.kt` (`4%` trim, adaptive contrast threshold, hollow-box filter, `<=22px` top-diacritic re-attachment, Blackhat shadow + core empty filter, `48px` glyph occupancy, `hasTopDiacritic` geometric flag) and hard `Ё`/`Й` constraint into `SheetReader.kt`.
3. **Domain Calibration (`τ = 0.85`) & Cell Fixes (`src/domain/`)**:
   - Update `src/domain/ocr/decision.ts` to calibrated `v4` selective prediction (`confidenceThreshold = 0.85`): confident cells (`>= 0.85`) are auto-accepted as `match` or `mismatch`, while non-empty cells `< 0.85` become `uncertain` (`status = 'review'`).
   - Extend `src/domain/scan/evaluate.ts` with `top3` per cell and `CellFixes` (`applyCellFixes`) so tapping a candidate updates `predicted`, recalculates `recognized` and task `status` against `expected`, and feeds exact corrected letters into `src/domain/sync/payload.ts`.
4. **Zero-Touch & Spot-Focus Top-3 UI (`src/features/checking/`)**:
   - Update `scanSession.ts` with `fixCell(taskNumber, cellIndex, char)`, `clearCellFix`, and `saveAndContinue()`.
   - Update `ProcessingScreen.tsx` to fast-track directly to `AssessmentResultScreen` when `studentMatched && !outcome.warnings?.length`.
   - Upgrade `AssessmentResultScreen.tsx` with a tappable Student Header Pill, emerald Zero-Touch banner («Всё чисто, 100% распознано»), swipe-right / 1-tap «Сохранить и следующий лист» action (returning directly to `ScanScreen`), and yellow spot-focus summary badge (`Ячеек под вопросом: N`).
   - Upgrade `TaskReviewScreen.tsx` and `ReviewCard.tsx` with interactive per-cell boxes (yellow highlight + confidence badge on `< 85%` cells), thumb-zone 1-tap Top-3 candidate chips, `[Пусто]` chip, and a custom 39-letter Tatar uppercase picker modal (`TatarLetterPickerModal.tsx`) so the OS keyboard is never needed.

## File ownership

| File / area | Writer |
|---|---|
| `docs/adr/0005-onnx-runtime-first-benchmark.md`, `docs/architecture/ocr-pipeline.md`, `docs/STATUS.md` | Antigravity |
| `models/ocr/*`, `modules/ocr-native/**` | Antigravity |
| `src/domain/ocr/**`, `src/domain/scan/**`, `src/domain/sync/**` | Antigravity |
| `src/features/checking/**`, `app.json`, `package.json` | Antigravity |

## Risks

- **XNNPACK operator compatibility on `TatarOCRNetV3_MultiScale` (`Sigmoid` in SE blocks)** → Verify on real Android ORT 1.30 runtime; `CameraController` includes automatic fallback to `INT8 + CPU` if XNNPACK session creation throws.
- **OpenCV Java `Blackhat` / `estimateAffinePartial2D` API nuances in OpenCV 5.0.0 Android AAR** → Compile with `./gradlew assembleDebug` and verify parity on the 12 real benchmark blanks via `OcrNative.sheetTest`.
- **Teacher accidentally saving under wrong matched student in Fast-Track mode** → Render prominent tappable Student Identity Pill with «Изменить» right at the top of `AssessmentResultScreen`, and still route to `StudentIdentifiedScreen` whenever `!studentMatched` or warnings exist.

## Deviations

None yet.
