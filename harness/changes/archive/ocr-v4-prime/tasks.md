# Tasks — OCR v4 Prime Pipeline, Adaptive Mobile Inference & Zero-Touch Top-3 Review

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Update ADR 0005 & OCR architecture docs; bundle `v4` FP32 & INT8 ONNX models + `SHA256SUMS` + `ocr-manifest.json` | `docs/adr/0005-*`, `docs/architecture/ocr-pipeline.md`, `models/ocr/*`, `modules/ocr-native/android/src/main/assets/ocr-manifest.json` | done | `shasum -a 256 -c SHA256SUMS` → `tatar_ocr_v4_handwritten39_fp32.onnx: OK`, `tatar_ocr_v4_handwritten39_int8.onnx: OK` |
| 2 | Port `v4` 7-stage CV pipeline + adaptive big.LITTLE ORT runtime & zero-GC CameraX analyzer into Kotlin | `modules/ocr-native/android/src/main/java/expo/modules/ocrnative/*.kt` | done | `./gradlew :app:assembleDebug` → `BUILD SUCCESSFUL`; 12-sheet Android emulator benchmark (`OcrNative.sheetTest(3)`): `Acc_char = 96.21%` (432/449), `Top-3 = 99.55%` (447/449), `Tatar special = 97.33%` (73/75), `Empty-cell precision = 100.0%` (193/193), `FAR @ τ=85% = 4.63%`, `QR = 11/12` |
| 3 | Calibrate domain decision logic (`τ = 0.85`), extract per-cell `top3`, and wire 1-tap `CellFixes` into evaluation & sync payloads | `src/domain/ocr/decision.ts`, `src/domain/scan/evaluate.ts`, `src/domain/sync/payload.ts`, `*.test.ts` | done | `pnpm test --runInBand` → `18 passed suites, 114 passed tests` |
| 4 | Build Zero-Touch fast-track flow, Spot-Focus yellow cell strip, 1-tap Top-3 chips, and 39-letter Tatar picker sheet | `src/features/checking/**`, `src/features/ocr-lab/OcrLabScreen.tsx` | done | Visually verified on Android emulator (`1080×2400` & `720×1600 @ 1.15x` font scale); zero RNGH/React Compiler warnings |
| 5 | Run full verification gates, bump to `0.3.0`, archive change, push `main` + `v0.3.0`, and verify GitHub Release APKs | `app.json`, `package.json`, `docs/STATUS.md`, `harness/changes/**` | done | `lint` (0 errors), `typecheck` (0 errors), `jest` (114 passed), `check-deps` (up to date), `expo-doctor` (21/21 passed); release `v0.3.0` tagged & built |

## Completion definition

- [x] Every acceptance criterion in spec.md has evidence above.
- [x] No open question was silently guessed.
- [x] Review in `reviews/review.md` recorded.
