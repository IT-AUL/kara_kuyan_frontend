# Tasks — Pro Document Scanner CameraX Pipeline & Optical HUD Controls (`v0.4.2`)

Atomic, ordered. Each task names its writer and its verification evidence.

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Update ADR 0006 & `ocr-pipeline.md` and calibrate OpenCV 5.0.0 sharpness/glare metrics on 14 real sheets | `docs/adr/0006-camerax-in-native-module.md`, `docs/architecture/ocr-pipeline.md` | done | OpenCV 5.0.0 calibration run (`S=81..192` sharp vs `26` blurry vs `25..52` noisy defocus; `MIN_SHARPNESS_P99 = 62.0`, hotspot glare `0/14` false positives) |
| 2 | Implement CameraX 1.6.2 Pro pipeline in `CameraController.kt`, `OcrCameraView.kt`, `OcrNativeModule.kt`, and `modules/ocr-native/src/index.ts` | `modules/ocr-native/**` | done | `:app:assembleDebug` (`BUILD SUCCESSFUL`) + Android 16 `OcrCamera` logcat: `bound mode=ZSL zslSupported=true hasFlash=true evIdx=2 zoom=1.00`, `setZoom ratio=1.40`, `af done reason=tap focused=true`, `capture attempt=1 ... performing 1x silent retry`, `capture attempt=2` |
| 3 | Wire `setTorch`, `setZoom`, and capabilities through `OcrSession`, `nativeOcrEngine`, `scanSession`, `AppIcon`, `ScanHud`, and `ScanScreen` + Jest unit tests | `src/ports/ocr-engine.ts`, `src/adapters/ocr-native/*`, `src/design-system/components/AppIcon.tsx`, `src/features/checking/**` | done | `expo lint` (0), `tsc --noEmit` (0), `jest --runInBand` (22/22 suites, 128 passed incl. `ScanHud.test.tsx`), `expo install --check` (up to date), `expo-doctor` (21/21 passed) |
| 4 | Bump version to `0.4.2`, run all 5 quality gates, clean Android build, and verify on Android 16 emulator (`/scan` HUD controls + `OcrCamera` telemetry + `sheetTest(3)`) | `app.json`, `package.json` | done | Android 16 (`Medium_Phone_API_36.1`): 4:3 `FIT_CENTER` preview & `1×` / `1.4×` screenshots verified; `sheetTest(3)` scored `435/449` (`96.88%`) Top-1, `447/449` (`99.55%`) Top-3, `portrait_exif_blank_01.jpg` exact match `True` |
| 5 | Complete review, archive change, update `docs/STATUS.md`, tag & push `v0.4.2`, and verify GitHub Actions `CI` + `Release Android` | `harness/changes/**`, `docs/STATUS.md` | done | Archived to `harness/changes/archive/camera-pro-capture-v42`, tagged & pushed `v0.4.2`, verified on GitHub Actions |

## Completion definition

- [x] Every acceptance criterion in spec.md has evidence above.
- [x] No open question was silently guessed.
- [x] Review in `reviews/review.md` recorded.
