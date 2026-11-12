# Spec — Canonical C++20 Native OCR Pipeline (`tatar_ocr_core`)

WHAT and WHY only. No implementation detail.

## Goal

1. Replace the hand-ported Kotlin/Java OpenCV + ONNX Runtime OCR pipeline in `modules/ocr-native` with the upstream canonical C++20 `tatar_ocr_core` (`tatar_ocr::NativeBlankScanner`) from `https://github.com/DanisGaleev/tatar_ocr.git` (`v3-architecture-training` @ `d27477b`), connected as an unmodified Git submodule at `third_party/tatar_ocr` with `pipeline_spec.json` and `tatar_ocr_v4_handwritten39_int8.onnx` shipped in Android assets, and eliminate the real-phone portrait rotation, YUV/EXIF decoding, border-suppression, and contour-fallback bugs that caused scan failures in `v0.3.0`.
2. Add modern Android 13–16 notifications and a persistent in-app News, Important Events & Helpful Info Center (`/notifications`, ADR 0010) using `expo-notifications@~57.0.25` via ports/adapters — zero FCM/server dependency, zero student PII on lockscreens, contextual `POST_NOTIFICATIONS` opt-in after registering 4 granular `NotificationChannel`s, interactive tray action buttons, and actionable teacher tips.

## Non-goals

- Modifying files inside the upstream `third_party/tatar_ocr` submodule.
- Persisting or exposing raw camera frames, rectified sheets, or cropped glyph pixels outside native memory (Zero-Photo invariant, ADR 0003).
- Changing backend HTTP endpoints or inventing new server semantics.

## Assumptions

- `https://github.com/DanisGaleev/tatar_ocr.git` branch `v3-architecture-training` (`d27477b`) provides the authoritative C++20 `tatar_ocr_core` static library target, `pipeline_spec.json`, and `models/tatar_ocr_v4_handwritten39_int8.onnx`.
- `org.opencv:opencv:5.0.0` AAR (Prefab `opencv::opencv_java5`) and `com.microsoft.onnxruntime:onnxruntime-android:1.30.0` AAR (`headers/` + `jni/<ABI>/libonnxruntime.so`) supply the native C++ headers and shared libraries across `arm64-v8a`, `armeabi-v7a`, and `x86_64`.

## Acceptance criteria

- [x] `third_party/tatar_ocr` is added as a clean Git submodule tracking `v3-architecture-training`, and CI/Release GitHub Actions workflows check out submodules (`submodules: recursive`).
- [x] `pipeline_spec.json` and `tatar_ocr_v4_handwritten39_int8.onnx` from `third_party/tatar_ocr` are packaged into Android APK assets (without bundling extraneous `.pth` training checkpoints) and extracted with SHA-256 verification into `context.filesDir` for `tatar_ocr::NativeBlankScanner`.
- [x] `modules/ocr-native/android` builds `tatar_ocr_core` (with `TATAR_OCR_BUILD_PYTHON=OFF`) and `tatar_ocr_jni` via CMake + Android NDK cleanly across `expo prebuild --platform android --clean` and `./gradlew :app:assembleDebug` / `assembleRelease`.
- [x] JNI bridge invokes `tatar_ocr::NativeBlankScanner::process_blank` (and `detect_markers_padded` for live viewfinder corner-marker lock), decodes QR from `res.rectified_bgr` in native memory, frees all `cv::Mat` buffers immediately (ADR 0003), and returns structured `BlankResult` fields (`student_name`, `student_name_cells`, `questions` with `q_num`, `text`, `cells` [`char`, `confidence`, `is_empty`, `top3`, `bbox`], `stats`, `rectification_method`) mapped cleanly into `SheetEvidence` for Zero-Touch (`τ = 85%`) and 1-Tap Top-3 review.
- [x] Portrait camera captures (`ImageProxy` JPEG + `YUV_420_888` + `rotationDegrees`) and gallery/file imports (`ExifInterface` orientation) orient frames upright before calling `NativeBlankScanner`, and all valid `NativeBlankScanner` rectification modes (including `Document Contour Fallback`) are accepted.
- [x] Android notifications & in-app `/notifications` center (`ADR 0010`) register 4 Android `NotificationChannel`s and 4 interactive `NotificationCategory` button sets, request `POST_NOTIFICATIONS` only contextually after channel creation, surface unread count on `HomeScreen` and `MoreScreen`, never include student PII in system notifications, and route notification taps into Expo Router.
- [x] On-device Android `arm64-v8a` verification passes on all 12 real handwritten sheets (including rotated portrait EXIF test), verifies `/notifications` + Android notification banner, and all 5 repository gates (`lint`, `typecheck`, `test`, `check-deps`, `doctor`) pass.

## Open questions

- None — upstream C++ integration contract specified directly by `@DanisGaleev`.
