# Review — Canonical C++20 Native OCR Pipeline (`tatar_ocr_core`) & Android Notifications Hub

Independent review.

## Verdict

approved

## Evidence check

- [x] Every spec acceptance criterion has matching recorded evidence.
- [x] Claimed test/build outputs were actually produced (not narrated).

### Recorded outputs

- **Submodule & integrity**:
  - `git submodule status` → `d27477bbbb9a75a8e6161d06ebf2fb53068992cf third_party/tatar_ocr (v3-architecture-training)` (`git diff` inside submodule completely empty).
  - `cd models/ocr && sha256sum -c SHA256SUMS` → OK.
- **NDK C++20 compilation & APK packaging**:
  - `CI=1 pnpm exec expo prebuild --platform android --clean --no-install && cd android && ./gradlew :app:assembleDebug` → `BUILD SUCCESSFUL`.
  - `unzip -l android/app/build/outputs/apk/debug/app-debug.apk`:
    - `lib/arm64-v8a/libtatar_ocr_jni.so` (437,808 B, `-Wl,-z,max-page-size=16384`, `-O3`)
    - `lib/arm64-v8a/libopencv_java5.so` (single shared copy via Prefab `OpenCV::opencv_java5`)
    - `lib/arm64-v8a/libonnxruntime.so` (single copy)
    - `assets/pipeline_spec.json` (4,308 B), `assets/tatar_ocr_v4_handwritten39_int8.onnx` (1,024,619 B), `assets/tatar_ocr_v4_handwritten39_fp32.onnx` (3,782,792 B).
- **Android 16 (`arm64-v8a`, API 36.1) on-device C++20 OCR verification**:
  - `OcrNative.info()` → `{"opencvLoaded":true,"opencvVersion":"5.0.0","engine":"tatar_ocr_core_cpp20","scannerReady":true,"modelFile":"tatar_ocr_v4_handwritten39_int8.onnx","specFile":"pipeline_spec.json","abi":"arm64-v8a"}`.
  - `OcrNative.sheetTest(3)` across 14 sheets:
    - 12 real handwritten benchmark sheets (`blank_01.jpg`..`blank_12.jpg`): **Top-1 exact `435/449` (`96.88%`)**, **Top-3 hit `447/449` (`99.55%`)**, 0 crashes/errors.
    - Real phone photo (`test_blank_phone_photo.jpg`): 8/8 words exact (`КИТАПКА`, `ӨСТӘЛДӘН`, `БАЛАЛАР`, `ХӘЕРЛЕ`, `УРМАННЫҢ`, `ДӨРЕС`, `РӘХМӘТ`, `ДӘФТӘРНЕ`) + QR decoded.
    - Portrait rotated EXIF=6 test (`portrait_exif_blank_01.jpg`, raw `1024×768` sideways pixels): 100% identical output to upright `blank_01.jpg` (`Exact match: True`).
- **Android 16 (`API 36.1`) Notifications & News Hub (`ADR 0010`) verification**:
  - Visual & `uiautomator` verification of `HomeScreen` bell badge, `MoreScreen` unread pill (`новых: 5`), `/notifications` tabs (`Все`, `События`, `Инфо`, `Настройки`), Android 13–16 `canAskAgain` permission handling, and `dumpsys notification --noredact` confirming `android.title=String (Кара Куян · уведомления подключены)` on channel `Проверка и синхронизация` with zero student PII.
- **Static gates**:
  - `pnpm run lint` → 0 errors, 0 warnings
  - `pnpm run typecheck` → 0 errors
  - `pnpm test --runInBand` → 19 passed suites, 120 passed tests (9 live opt-in skipped)
  - `pnpm run check-deps` → `Dependencies are up to date`
  - `pnpm run doctor` → `21/21 checks passed. No issues detected!`

## Deviations from plan

| Deviation | Justified? | Note |
|---|---|---|
| Prefab target case is `OpenCV::opencv_java5` (capital `OpenCV`) with `unset(OpenCV_DIR CACHE)` before `find_package(OpenCV REQUIRED CONFIG)` | Yes | Ensures case-sensitive Linux CI (`ubuntu-latest`) and incremental CMake re-runs resolve Prefab's `OpenCVConfig.cmake` deterministically before writing the submodule shim. |
| Checked `res.canAskAgain === false` in `expoNotificationsAdapter` (`mapPermission`) | Yes | On Android 13–16, `getPermissionsAsync()` returns `status: 'denied', canAskAgain: true` before the first runtime prompt; checking `canAskAgain` ensures fresh installs trigger the 1-tap OS dialog instead of opening Settings. |

## Issues found

- Resolved during implementation:
  1. OpenCV Prefab CMake target casing (`opencv::opencv_java5` → `OpenCV::opencv_java5`) + `-O3` compile flag on `tatar_ocr_core`.
  2. Android 13–16 `canAskAgain` permission status mapping in `src/adapters/notifications/expo-notifications.ts`.

## Residual risks

- Upstream `NativeBlankScanner::process_blank` runs ONNX Runtime cell-by-cell (`batch = 1`) with default ORT `SessionOptions`; we intentionally keep `third_party/tatar_ocr` 100% unmodified for bit-for-bit upstream parity and easy `git submodule update --remote`.
