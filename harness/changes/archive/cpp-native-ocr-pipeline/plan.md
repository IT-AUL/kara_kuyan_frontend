# Plan — Canonical C++20 Native OCR Pipeline (`tatar_ocr_core`)

HOW the spec is delivered.

## Approach

1. **Submodule & CI wiring**:
   - Add `https://github.com/DanisGaleev/tatar_ocr.git` (`-b v3-architecture-training`) at `third_party/tatar_ocr`.
   - Enable `submodules: recursive` in `.github/workflows/ci.yml` and `.github/workflows/release-android.yml`.
2. **Self-contained NDK CMake build inside `modules/ocr-native/android` (survives `expo prebuild --clean`)**:
   - Enable `buildFeatures { prefab true }` so `org.opencv:opencv:5.0.0` exposes `opencv::opencv_java5` headers (`core`, `imgproc`, `calib3d`, `objdetect/aruco_detector.hpp`) and `libopencv_java5.so`. Generate a tiny `OpenCVConfig.cmake` shim in `${CMAKE_CURRENT_BINARY_DIR}` setting `OpenCV_INCLUDE_DIRS` and `OpenCV_LIBS` so `third_party/tatar_ocr/native/CMakeLists.txt`'s `find_package(OpenCV REQUIRED)` resolves without touching the submodule or duplicating OpenCV in the APK.
   - Extract `headers/**` and `jni/**` from `com.microsoft.onnxruntime:onnxruntime-android:1.30.0` AAR into `${buildDir}/ort-native` via a Gradle task (`prepareTatarOcrNativeDeps`) before CMake configuration, passing `ONNXRUNTIME_INCLUDE_DIR` and `ONNXRUNTIME_LIB` (`jni/${ANDROID_ABI}/libonnxruntime.so`).
   - Vendor MIT single-header `nlohmann/json.hpp` (`v3.11.3`) under `modules/ocr-native/android/src/main/cpp/third_party/nlohmann/json.hpp` and pass `NLOHMANN_JSON_INCLUDE_DIR`.
   - Copy only `third_party/tatar_ocr/pipeline_spec.json` and `third_party/tatar_ocr/models/tatar_ocr_v4_handwritten39_int8.onnx` into generated Android assets (`${buildDir}/generated/tatar_ocr_assets`) so no `.pth` checkpoints bloat the APK.
3. **JNI Bridge (`jni_bridge.cpp`) & Kotlin/Camera Integration**:
   - Hold a thread-safe `tatar_ocr::NativeBlankScanner(model_path, spec_path)` singleton initialized once from `context.filesDir` (`ModelStore`).
   - Expose `nativeInitScanner`, `nativeProcessBlank(scannerPtr, bgrMatAddr, outRectifiedMatAddr)`, and `nativeDetectMarkers(scannerPtr, previewMatAddr, pad)` via JNI.
   - Because both Kotlin OpenCV (`org.opencv.core.Mat`) and `tatar_ocr_jni` link dynamically against the exact same `libopencv_java5.so`, `cv::Mat*` native addresses (`mat.nativeObjAddr`) pass zero-copy in native memory and are explicitly released in `finally` blocks (ADR 0003).
   - Fix `CameraController.capture()` and `readEncoded()`:
     - Support both `ImageFormat.JPEG` and `ImageFormat.YUV_420_888` in `ImageCapture.OnImageCapturedCallback`.
     - Parse EXIF orientation via `android.media.ExifInterface` (on encoded bytes) + `image.imageInfo.rotationDegrees` (when Camera2 HAL omits EXIF orientation) and rotate `cv::Mat` upright in native memory before `process_blank`.
     - Widen and fix QR fallback (`BGR -> RGBA` before `Utils.matToBitmap`, wider header ROI `[170..560, 20..360]`, adaptive threshold pass, 2000 ms ML Kit timeout).
     - Accept all aligned `rectification_method` values from `NativeBlankScanner` (rejecting only `"Direct Scaling (No markers detected)"`).
4. **Domain Evidence Mapping (`evidence.ts`, `decision.ts`, `evaluate.ts`)**:
   - Extend `CellEvidence` and `SheetEvidence` with optional canonical C++ fields (`char`, `confidence`, `top3`, `bbox`, `studentNameCells`, `stats`) while preserving full backward compatibility with `probabilities`-based unit tests.
   - Ensure Stage-6 diacritic-guarded predictions (`Ё -> Е`, `Й -> О/И`) keep their exact C++ `top1` / `top3` ordering in `evaluateCell` and `evaluateSheet`.
5. **Android Notifications & In-App News/Events/Helpful Info Hub (`ADR 0010`)**:
   - Install SDK-57 `expo-notifications@~57.0.25` and configure `app.json` monochrome notification icon + `#25E38A` accent color.
   - Create pure domain (`src/domain/notifications/feed.ts` + unit tests) for 4 channels, curated news/tips, live event derivation (pack complete, sync failure, class topic insight, GitHub Release update), and Android 15 cooldown-friendly deduplication.
   - Create `NotificationsPort` (`src/ports/notifications.ts`) + `expo-notifications` adapter (`src/adapters/notifications/expo-notifications.ts`) wired in `src/composition.ts`.
   - Build `notificationCenter`, root `NotificationObserver`, `/notifications` screen (`Все` / `События` / `Инфо` / `Настройки`), and unread entry points in `HomeScreen` (bell icon + count badge) and `MoreScreen`.

Rejected alternatives:
- Putting CMake/JNI in `/android/app/src/main/cpp` — rejected because `.github/workflows/release-android.yml` runs `expo prebuild --platform android --clean`, wiping `/android` on every release build.
- Re-patching the hand-ported Kotlin CV pipeline — rejected because maintaining a second port drifts from `DanisGaleev/tatar_ocr` and caused the `v0.3.0` regressions.

## File ownership

| File / area | Writer |
|---|---|
| `docs/adr/0005-onnx-runtime-first-benchmark.md`, `docs/adr/0010-android-notifications-and-news-feed.md`, `docs/adr/README.md`, `docs/architecture/ocr-pipeline.md`, `docs/STATUS.md` | Antigravity |
| `.gitmodules`, `third_party/tatar_ocr` | Antigravity |
| `.github/workflows/ci.yml`, `.github/workflows/release-android.yml` | Antigravity |
| `modules/ocr-native/**`, `src/adapters/ocr-native/index.ts` | Antigravity |
| `src/domain/ocr/evidence.ts`, `src/domain/ocr/decision.ts`, `src/domain/ocr/decision.test.ts`, `src/domain/scan/evaluate.ts`, `src/domain/scan/evaluate.test.ts` | Antigravity |
| `src/domain/notifications/**`, `src/ports/notifications.ts`, `src/adapters/notifications/expo-notifications.ts`, `src/composition.ts`, `src/features/notifications/**`, `app/notifications.tsx`, `app/_layout.tsx`, `src/features/home/HomeScreen.tsx`, `src/features/home/MoreScreen.tsx`, `src/design-system/components/AppIcon.tsx` | Antigravity |
| `app.json`, `package.json`, `pnpm-lock.yaml` | Antigravity |
| `harness/changes/active/cpp-native-ocr-pipeline/**` | Antigravity |

Rule: one writer per file. Everything else is read-only analysis.

## Risks

- **OpenCV 5 Prefab package naming (`opencv` vs `OpenCV`)** → Mitigated by generating a 4-line `OpenCVConfig.cmake` wrapper in CMake build dir before `add_subdirectory(.../third_party/tatar_ocr/native)`.
- **Submodule size in CI** → Mitigated by `submodules: recursive` in GitHub Actions checkout and selective Gradle asset copying (`pipeline_spec.json` + `tatar_ocr_v4_handwritten39_int8.onnx` only).
- **Double rotation on CameraX JPEG when HAL embeds EXIF Orientation AND sets `rotationDegrees`** → Mitigated by reading EXIF `TAG_ORIENTATION` first: if EXIF orientation is present (`!= ORIENTATION_UNDEFINED && != ORIENTATION_NORMAL`), apply EXIF rotation (`IMREAD_IGNORE_ORIENTATION` + explicit rotate); only if EXIF orientation is absent/undefined, apply `imageInfo.rotationDegrees`.

## Deviations

None yet.
