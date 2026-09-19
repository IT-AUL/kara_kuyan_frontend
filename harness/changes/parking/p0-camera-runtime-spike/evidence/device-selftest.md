# On-device parity self-test — 2026-09-19 17:37

Run by the lead on the physical Samsung SM-S928B (SM8650, Android 16, arm64-v8a) through the dev-only screen `karakuyan://ocr-lab` → "Сверка с golden" (`OcrNative.selfTest()`), output read from `adb logcat` (`ReactNativeJS: [ocr-lab] …`).

## Build
- Dev client built with `./gradlew :app:installDebug` (BUILD SUCCESSFUL in 2m 33s, arm64-v8a only) and installed on the device; JS served by Metro on port 8081 via `adb reverse`.
- Native module `modules/ocr-native`: ONNX Runtime Android 1.30.0, OpenCV 5.0.0 (`org.opencv:opencv`), both from Maven; `info()` → `{"opencvLoaded":true,"opencvVersion":"5.0.0","abi":"arm64-v8a"}`.
- Inputs pushed with `adb push` + `run-as` into `files/ocr-lab/{fixtures,models}` (app-private, not bundled): 117 synthetic cells + `golden.json` + `golden_inp64.bin` (from `tools/ocr-lab`, authors' exact preprocessing) and the two ONNX files (SHA-256 as in `device-and-models.md`).

## Result (raw)
```json
{"preprocess":{"cells":117,"exactCells":117,"maxPixelDiff":0,"differingPixels":0,"totalMs":199.01427},
 "lanes":[
  {"model":"tatar_ocr_uppercase39_fp32.onnx","maxLogitDiffVsGolden":0.00001239776611328125,"argmaxMatchesGolden":117,"argmaxMatchesLabel":117,"batchOfCellsMs":298.689218},
  {"model":"tatar_ocr_uppercase39_int8.onnx","maxLogitDiffVsGolden":0.0000057220458984375,"argmaxMatchesGolden":117,"argmaxMatchesLabel":117,"batchOfCellsMs":272.303854}]}
```

## Reading
- **AC2 (preprocessing parity):** the Kotlin `CellPreprocessor` reproduces the authors' `classify_cell` bit-exactly on all 117 fixture cells (0 differing pixels), including Python rounding and numpy percentile/median semantics.
- **AC1/AC2 (inference parity):** FP32 (XNNPACK, 4 threads) and dynamic INT8 (CPU) logits match the desktop golden to ≤1.3e-5; argmax equals golden and the synthetic label for 117/117.
- **Not benchmark evidence (AC3):** `totalMs`/`batchOfCellsMs` are single cold runs (first inference includes XNNPACK/graph warm-up; preprocessing includes file reads and PNG decoding). Median/p95 over repeated warm runs are still to be measured (task 9).
- Caveats: synthetic printed letters only; handwriting parity/accuracy untested (needs the evaluation set).
