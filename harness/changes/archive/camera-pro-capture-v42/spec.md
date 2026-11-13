# Spec — Pro Document Scanner CameraX Pipeline & Optical HUD Controls (`v0.4.2`)

WHAT and WHY only. No implementation detail.

## Goal

Ensure live worksheet captures taken inside Kara Kuyan's `/scan` screen match the optical sharpness, exposure, perspective fidelity, and handwriting OCR accuracy (`Acc_char = 96.88%` / `Top-3 = 99.55%`) of photos imported from the stock Android Camera app across budget, mid-range, and flagship large-sensor Android phones, while keeping 100% of student worksheet pixels in native memory (`ADR 0003`).

## Non-goals

- Modifying the upstream `third_party/tatar_ocr` C++20 submodule or ONNX `v4` model weights.
- Persisting, transmitting, or exposing camera frames or student PII outside native memory (`ADR 0003`).
- Adding new third-party camera SDKs (VisionCamera, Scanbot, etc.).

## Assumptions

- `androidx.camera:camera-{core,camera2,lifecycle,view}:1.6.2` is already linked in `modules/ocr-native/android/build.gradle` (verified).
- Large-sensor Android flagships (`1/1.3"`–`1/1.56"` 50–200 MP, e.g., Samsung Galaxy S24 Ultra `SM-S928B`) exhibit close-range peripheral field curvature (*banana blur*) at `1x` `< 28 cm`, mitigated by stepping back slightly with `1.4x` optical/in-sensor crop.
- Fixed-focus budget tablets/phones may reject or time out `startFocusAndMetering`; pre-capture AF wait must bound timeout (`≤ 1200 ms`) and degrade gracefully without failing capture.

## Acceptance criteria

- [x] **AC1 — Full-res 4:3 CameraX streams & ISP tuning:** `Preview`, `ImageAnalysis`, and `ImageCapture` share 4:3 aspect strategy with `PreviewView.ScaleType.FIT_CENTER`; `ImageCapture` uses `PREFER_HIGHER_RESOLUTION_OVER_CAPTURE_RATE` (`4200×3150` target, `JPEG` quality `95`), hybrid `CAPTURE_MODE_ZERO_SHUTTER_LAG` (when `isZslSupported && !torchEnabled`) / `CAPTURE_MODE_MAXIMIZE_QUALITY`, `Camera2Interop` (`EDGE_MODE_HIGH_QUALITY`, `NOISE_REDUCTION_MODE_FAST`), and `+0.5 EV` white-paper exposure compensation.
- [x] **AC2 — Active AF/AE convergence & Tap-to-Focus:** `CameraController` stores bound `Camera`, triggers sheet-ROI `FocusMeteringAction` (`FLAG_AF | FLAG_AE`) with cooldown plus interactive tap-to-focus on `PreviewView`, holds `locked` while `afInFlight`, and awaits bounded AF convergence before `takePicture`.
- [x] **AC3 — Noise-immune real-time DQA & post-capture `1×` retry:** Analyzer uses denoised `Gaussian(5×5) + Sobel(3×3) P99` sharpness (`MIN_SHARPNESS_P99 = 62.0`, calibrated on `blank_01..12` + `test_blank_phone_photo`), tightened jitter (`6.0 px`, `4` frames), and emits `'tilted'`, `'too-dark'`, and localized-hotspot `'glare'` hints without false-flagging bright clean white paper; `capture()` checks full-res sharpness and performs a `1×` silent re-capture on shutter motion blur.
- [x] **AC4 — Teacher HUD controls & ADR-0003 telemetry:** `OcrSession` exposes `setTorch` and `setZoom`; `ScanHud` & `ScanScreen` provide accessible `Свет` and `1× / 1.4×` controls (reset on screen exit, race-free `ready` capability polling); `OcrCamera` logs numeric-only capture/DQA telemetry with zero pixels or PII.
- [x] **AC5 — Quality gates, Android 16 verification & `v0.4.2` release:** `lint`, `typecheck`, `jest` (22 suites / 128 passed), `check-deps`, `doctor` (21/21), clean Android Gradle build, Android 16 emulator `/scan` + `sheetTest(3)` (`96.88%` Top-1 / `99.55%` Top-3 / portrait EXIF=6 exact match `True`) pass, and GitHub Actions `CI` + `Release Android` publish `v0.4.2` APKs.

## Open questions

- None blocking `v0.4.2`; real-device `OcrCamera` logcat comparison on Danis's handset can further fine-tune EV/zoom defaults if needed.
