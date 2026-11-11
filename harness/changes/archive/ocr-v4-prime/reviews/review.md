# Review — OCR v4 Prime Pipeline, Adaptive Mobile Inference & Zero-Touch Top-3 Review

## Verdict

APPROVED

## Evidence check

- [x] Every spec acceptance criterion has matching recorded evidence.
- [x] Claimed test/build outputs were actually produced (not narrated).

## Key Verified Metrics (Android `arm64-v8a` Emulator, 12 Real Handwritten Sheets)

- **Character accuracy (`Acc_char`)**: `432 / 449 = 96.21%` (exceeds Python `v4` reference `431 / 449 = 95.99%`).
- **Top-3 candidate recall**: `447 / 449 = 99.55%` (exceeds `98.25%` target).
- **Tatar special letters (`Ә, Ө, Ү, Җ, Ң, Һ`)**: `73 / 75 = 97.33%`.
- **Empty-cell filter precision**: `193 / 193 = 100.00%` (zero grid/shadow false ink hallucinations).
- **False Alarm Rate at `τ = 85%`**: `20 / 432 = 4.63%` (`< 5%` target met).
- **Sheet rectification**: `12 / 12 = 100%` (`blank_03` recovered via `marker-similarity`, `blank_08` via `marker-homography`).
- **QR decode on compressed `768×1024` thumbnails**: `11 / 12 = 91.7%` after fixing exact PDF QR ROI (`[x: 235..495, y: 45..310]` + `24px` quiet zone).

## Deviations from plan

| Deviation | Justified? | Note |
|---|---|---|
| Named 39-letter modal component `TatarLetterPickerSheet.tsx` (using design-system `BottomSheet`) instead of `TatarLetterPickerModal.tsx` | Yes | Reuses the project's native-idiomatic `BottomSheet` design-system primitive instead of introducing a bespoke modal wrapper. |
| Fixed exact PDF QR ROI (`[x: 235..495, y: 45..310]` + `24px` quiet zone) and off-main-thread `450 ms` ML Kit timeout in `SheetPipeline.kt` / `OcrNativeModule.kt` | Yes | Caught during live emulator testing: the legacy ROI clipped the right/bottom edges of the QR code (`[262..455, 80..273]`), and `Tasks.await` on the module thread risked main-Looper deadlocks. |
| Synced 7 Expo SDK 57 patch dependencies (`~57.0.32`, etc.) in `package.json` | Yes | Required so `pnpm run check-deps` and `expo-doctor` (`21/21`) pass in local and CI release builds. |

## Issues found

- Resolved during implementation:
  1. `Tasks.await(mlKit.process(...))` main-Looper deadlock risk → fixed with background worker threads + `Looper.myLooper() != Looper.getMainLooper()` check + `450 ms` timeout.
  2. OpenCV `detectAndDecodeCurved` stall on blurry thumbnails → removed in favor of crisp + Otsu + `0.5x` downscaled `detectAndDecode`.
  3. RNGH worklet warning on `ZeroTouchBanner` / `ReviewCard` → fixed by marking `.onUpdate` and `.onEnd` with `'worklet'`.

## Residual risks

- Live server `GET /api/v1/model/manifest` still reports `v1` (`1.0.0`) until backend merges `v3-architecture-training` into `main`; non-blocking because `v4` ONNX models are bundled offline inside the APK.
