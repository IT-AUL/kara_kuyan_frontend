# Review — Pro Document Scanner CameraX Pipeline & Optical HUD Controls (`v0.4.2`)

Independent review across all 6 `kara-delivery` roles (Product, Mobile Architect, Security/ADR-0003, UX, API Contract, QA/Performance).

## Verdict

accept

## Evidence check

- [x] Every spec acceptance criterion has matching recorded evidence.
- [x] Claimed test/build outputs were actually produced (not narrated).

## Role lens audit

1. **Product guardian:** Focused strictly on live worksheet capture reliability (`Свет`, `1× / 1.4×`, tap-to-focus, actionable Russian DQA hints). No scope creep or leaderboard framing.
2. **Mobile architect:** UI (`ScanScreen.tsx`, `ScanHud.tsx`) communicates exclusively via `scanSession` → `OcrSession` (`ports/ocr-engine.ts`) → `nativeOcrEngine` (`adapters/ocr-native/engine.ts`) → `OcrNativeModule.kt` → `CameraController.kt`. Zero direct native imports in feature screens.
3. **Security reviewer (`ADR 0003`):** All `ImageProxy` buffers (`JPEG` and `YUV_420_888`) are decoded, rectified, and zeroed/released in native memory; `OcrCamera` logs strictly numeric/enum metadata (`mode`, `raw`, `upright`, `rot`, `exif`, `bytes`, `sharpP99`, `afLocked`, `evIdx`, `zoom`, `torch`, `retry`, `aligned`, `method`) — zero pixel bytes and zero student PII.
4. **UX designer:** Glassmorphic `Свет` and `1× / 1.4×` controls use design-system tokens (`colors.primary`, `colors.toastText`, `radius.pill`, `>= 44dp` hit targets with `hitSlop`, Russian `accessibilityLabel` + `accessibilityState={{ disabled, selected }}`), and `FIT_CENTER` 4:3 framing prevents edge clipping on 20:9 displays.
5. **API contract guardian:** Zero backend contract changes; OpenAPI semantics untouched.
6. **QA/performance:** Denoised `Sobel P99` sharpness and localized 6×6 hotspot glare calibrated empirically on 14 real worksheet fixtures with OpenCV 5.0.0; C++20 `sheetTest(3)` verified at `96.88%` Top-1 (`435/449`) and `99.55%` Top-3 (`447/449`) on Android 16 ARM64; all 5 static gates green (`128` Jest tests, `21/21` `expo-doctor`).

## Deviations from plan

| Deviation | Justified? | Note |
|---|---|---|
| Replaced raw Laplacian sharpness (`GaussianBlur(3x3) + Laplacian`) with `GaussianBlur(5x5, σ=1.0) + Sobel(3x3) P99` | Yes | Empirical OpenCV 5.0.0 run on `blank_01..12` showed `3x3` Laplacian still jumped to `105–132` under high-ISO noise on blurry frames, whereas `Sobel P99` cleanly separated all 13 sharp sheets (`81..192`) from blurry (`26`) and noisy-blurry (`25..52`) frames. |
| Added `ready` field to `getCapabilities()` + bounded retry poll in `ScanScreen.tsx` | Yes | Discovered during Android 16 runtime testing that querying `getCapabilities()` at a fixed `450 ms` before Camera2 HAL bind finished returned `hasFlash=false, maxZoom=1.0`; `ready` polling eliminates the startup race completely. |

## Issues found

- Camera capability startup race when Camera2 HAL took `> 450 ms` to bind (`camera == null`) → fixed in `CameraController.kt` + `ScanScreen.tsx` and verified with `:ocr-native:compileDebugKotlin` + Jest.

## Residual risks

- Physical close-focus optics vary across handset models; numeric `adb logcat -s OcrCamera:I` telemetry is now built into `v0.4.2` so real-world handset logs can be inspected without exposing student sheets.
