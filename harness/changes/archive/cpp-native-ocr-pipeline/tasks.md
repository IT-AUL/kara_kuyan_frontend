# Tasks — Canonical C++20 Native OCR Pipeline (`tatar_ocr_core`) & Android Notifications Hub

Atomic, ordered. Each task names its writer and its verification evidence.

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Update ADR 0005, add ADR 0010, and update OCR pipeline architecture doc | `docs/adr/0005-onnx-runtime-first-benchmark.md`, `docs/adr/0010-android-notifications-and-news-feed.md`, `docs/adr/README.md`, `docs/architecture/ocr-pipeline.md` | done | Diffs verified in `docs/adr/` and `docs/architecture/ocr-pipeline.md` |
| 2 | Add `third_party/tatar_ocr` submodule (`v3-architecture-training`) and enable `submodules: recursive` in CI/Release workflows | `.gitmodules`, `third_party/tatar_ocr`, `.github/workflows/ci.yml`, `.github/workflows/release-android.yml` | done | `git submodule status` → `d27477bbbb9a75a8e6161d06ebf2fb53068992cf third_party/tatar_ocr (v3-architecture-training)` |
| 3 | Configure Gradle Prefab + ORT native extraction + selective asset packaging + CMakeLists.txt + `jni_bridge.cpp` in `modules/ocr-native/android` | `modules/ocr-native/android/build.gradle`, `modules/ocr-native/android/src/main/assets/ocr-manifest.json`, `modules/ocr-native/android/src/main/cpp/**`, `modules/ocr-native/android/src/main/java/expo/modules/ocrnative/**` | done | `expo prebuild --platform android --clean --no-install && cd android && ./gradlew :app:assembleDebug` → `BUILD SUCCESSFUL`; APK packs single `libopencv_java5.so`, `libonnxruntime.so`, `libtatar_ocr_jni.so` (437 KB), `pipeline_spec.json`, `tatar_ocr_v4_handwritten39_int8.onnx` |
| 4 | Fix CameraX portrait EXIF/YUV rotation, contour-fallback alignment acceptance, and QR RGBA/ROI fallback; map `BlankResult` to `SheetEvidence` | `modules/ocr-native/android/src/main/java/expo/modules/ocrnative/CameraController.kt`, `SheetReader.kt`, `OcrNativeModule.kt`, `src/domain/ocr/evidence.ts`, `src/domain/ocr/decision.ts`, `src/domain/scan/evaluate.ts`, unit tests | done | `pnpm test --runInBand` (19 suites / 120 passed) + Android 16 `arm64-v8a` emulator 14-sheet run: `blank_01..12` `435/449` (`96.88%`) Top-1, `447/449` (`99.55%`) Top-3, `test_blank_phone_photo.jpg` 8/8 exact + QR, `portrait_exif_blank_01.jpg` (EXIF=6, 90° rotated pixels) exact match `True` |
| 5 | Implement Android 13–16 local notifications + in-app `/notifications` News/Events/Helpful Info Hub (`ADR 0010`) | `src/domain/notifications/**`, `src/ports/notifications.ts`, `src/adapters/notifications/expo-notifications.ts`, `src/composition.ts`, `src/features/notifications/**`, `app/notifications.tsx`, `app/_layout.tsx`, `src/features/home/HomeScreen.tsx`, `src/features/home/MoreScreen.tsx`, `src/design-system/components/AppIcon.tsx` | done | `feed.test.ts` passed; verified on Android 16 `arm64-v8a` emulator (`HomeScreen` bell badge, `MoreScreen` unread pill, `/notifications` `Все`/`События`/`Инфо`/`Настройки`, `canAskAgain` permission handling, `NotificationManager` `Кара Куян · уведомления подключены` on `check_sync` channel) |
| 6 | Pass all 5 static quality gates, bump version to `0.4.0`, archive change, and cut GitHub Release `v0.4.0` | `app.json`, `package.json`, `pnpm-lock.yaml`, `docs/STATUS.md` | done | `lint`, `typecheck`, `test --runInBand` (120 passed), `check-deps` (up to date), `doctor` (`21/21` passed); version `0.4.0` |

## Completion definition

- [x] Every acceptance criterion in spec.md has evidence above.
- [x] No open question was silently guessed.
- [x] Review in `reviews/review.md` recorded.
