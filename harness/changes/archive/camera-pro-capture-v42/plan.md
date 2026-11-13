# Plan — Pro Document Scanner CameraX Pipeline & Optical HUD Controls (`v0.4.2`)

HOW the spec is delivered.

## Approach

Upgrade `CameraController.kt` and `OcrCameraView.kt` inside `modules/ocr-native` using CameraX 1.6.2 + `Camera2Interop` APIs already bundled in the app, empirically calibrate denoised `Sobel P99` sharpness and localized-hotspot glare detection against the 14 real sheet fixtures using OpenCV 5.0.0, wire `setTorch` / `setZoom` cleanly through `OcrSession` (`ports/ocr-engine.ts` → `adapters/ocr-native/engine.ts` → `scanSession.ts` → `ScanScreen.tsx` / `ScanHud.tsx`), add unit tests for the new HUD controls & session wiring, verify on Android 16 (`arm64-v8a`), and ship `v0.4.2`.

- Rejected: Switching to `react-native-vision-camera` — violates ADR 0006 simplicity and adds unnecessary native surface when CameraX 1.6.2 + `Camera2Interop` directly controls all required Camera2 HAL capture keys.
- Rejected: Raw `Y > 248` pixel fraction for glare — empirically false-flags clean bright white A4 sheets (`test_blank_phone_photo.jpg` has `93%` `Y > 248`); localized 6×6 patch contrast jump (`maxPatchMean > 238 && maxPatchMean - medianPatchMean > 26`) isolates real specular hotspots with zero false positives.

## File ownership

| File / area | Writer |
|---|---|
| `docs/adr/0006-camerax-in-native-module.md`, `docs/architecture/ocr-pipeline.md`, `docs/STATUS.md` | Antigravity |
| `modules/ocr-native/android/src/main/java/expo/modules/ocrnative/{CameraController.kt,OcrCameraView.kt,OcrNativeModule.kt}` | Antigravity |
| `modules/ocr-native/src/index.ts` | Antigravity |
| `src/ports/ocr-engine.ts`, `src/adapters/ocr-native/{CameraPreview.tsx,engine.ts}` | Antigravity |
| `src/design-system/components/AppIcon.tsx` | Antigravity |
| `src/features/checking/{ScanScreen.tsx,scanSession.ts}`, `src/features/checking/components/{ScanHud.tsx,ScanHud.test.tsx}` | Antigravity |
| `app.json`, `package.json` | Antigravity |

Rule: one writer per file. Everything else is read-only analysis.

## Risks

- **ZSL + Torch HAL incompatibility on some OEMs** → Only select `CAPTURE_MODE_ZERO_SHUTTER_LAG` when `cameraInfo.isZslSupported && !torchEnabled`; dynamically rebind the camera use cases on main executor when `setTorch` toggles between ZSL-eligible and torch-active states.
- **Fixed-focus budget devices hanging on `startFocusAndMetering`** → Bound `awaitFocusIfNeeded` to `1200 ms` and catch `OperationCanceledException` / `IllegalArgumentException` cleanly so capture always proceeds.
- **Over-strict post-capture blur gate blocking manual capture in dim classrooms** → Limit post-capture blur auto-retry to `1×` silent retry (`attempt == 0`); on `attempt == 1`, always proceed to `SheetReader.read()` and log `retry=1`.

## Deviations

None yet — filled at review time.
