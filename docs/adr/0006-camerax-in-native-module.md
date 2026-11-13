# ADR 0006: CameraX inside the native OCR module

**Status:** Accepted (2026-09-19)

## Context
The scan loop needs a live camera, alignment feedback and a still capture, while ADR 0003 forbids pixels outside native memory. Candidates were VisionCamera v5 (Nitro frame-processor plugin) and CameraX used directly inside our own Expo module.

## Decision
Use **CameraX inside `modules/ocr-native`**: a native `PreviewView` exposed as an Expo view, `ImageAnalysis` (Y plane) for marker count / sharpness / stability, and `ImageCapture` for an in-memory JPEG that is decoded, read and zeroed. JS receives alignment numbers and structured evidence only. VisionCamera was not built or measured; it stays an option only if CameraX proves inadequate.

## Consequences
- Positive: one owner of every pixel, no extra JS-visible frame path, no Nitro/worklets dependency for this feature; works on the reference phone (SM-S928B) end to end.
- Negative: we own camera lifecycle, threading and permissions. Verified on device: `takePicture` and `unbindAll` must run on the main thread; a capture in flight must defer `stop()`; OpenCV's native library must be loaded before the analyser creates a Mat.
- Evidence: `harness/changes/active/scan-check-flow/evidence/live-scan.md`.

## Amendment (2026-11-13, `camera-pro-capture-v42` / `v0.4.2`): Pro Document Capture Pipeline

Field testing showed that default `CameraX` `CAPTURE_MODE_MINIMIZE_LATENCY` with mismatched stream aspect ratios (`FILL_CENTER` preview vs 4:3 `ImageAnalysis` / `ImageCapture`), missing `ResolutionSelector.PREFER_HIGHER_RESOLUTION_OVER_CAPTURE_RATE` (triggering Camera2 3-stream `RECORD` 1080p downscale on `LIMITED`/`FULL` HALs), passive `CONTINUOUS_PICTURE` autofocus without `FocusMeteringAction` convergence wait, `-EV` white-paper auto-exposure graying, aggressive OEM spatial denoising, and noise-sensitive raw Laplacian sharpness (`threshold = 25`) degraded live-camera handwriting OCR compared to stock-camera gallery imports.

We upgrade `CameraController` + `OcrCameraView` + `OcrSession` inside `modules/ocr-native` while preserving ADR 0003 (zero pixels outside native memory, numeric-only `OcrCamera` telemetry):

1. **Unified 4:3 Streams & `FIT_CENTER` Framing**: `AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY` across `Preview`, `ImageAnalysis` (`1280×960`), and `ImageCapture` (`4200×3150`, `PREFER_HIGHER_RESOLUTION_OVER_CAPTURE_RATE`, `JPEG` quality `95`), paired with `PreviewView.ScaleType.FIT_CENTER` so all 4 ArUco corners seen by the teacher match the captured sensor frame without 20:9 edge cropping.
2. **Hybrid Capture Mode (`ZSL` / `MAXIMIZE_QUALITY`)**: Uses `@OptIn(ExperimentalZeroShutterLag::class) CAPTURE_MODE_ZERO_SHUTTER_LAG` when `cameraInfo.isZslSupported` and continuous torch is OFF (eliminating shutter-lag motion blur after `locked`), and dynamically rebinds `ImageCapture` with `CAPTURE_MODE_MAXIMIZE_QUALITY` when torch is ON or ZSL is unsupported.
3. **`Camera2Interop` ISP Tuning & White-Paper `+0.5 EV` Bias**: Sets `CaptureRequest.EDGE_MODE = EDGE_MODE_HIGH_QUALITY` and `CaptureRequest.NOISE_REDUCTION_MODE = NOISE_REDUCTION_MODE_FAST` so OEM spatial denoisers do not erase thin pen strokes or Tatar diacritics (`Ә, Ө, Ү, Җ, Ң, Һ`), and applies `+0.5 EV` exposure compensation clamped to `exposureState.exposureCompensationRange`.
4. **Active Sheet-ROI AF/AE + Tap-to-Focus + Convergence Gate**: Triggers `FocusMeteringAction` (`FLAG_AF or FLAG_AE`) on the detected 4-marker sheet centroid (with cooldown) and on teacher taps (`PreviewView` touch listener), blocks `phase = "locked"` while `afInFlight`, and awaits AF convergence (`≤ 1200 ms` bounded timeout for fixed-focus safety) prior to `takePicture`.
5. **Noise-Immune Real-Time DQA + Post-Capture `1×` Auto-Retry + Teacher Optical Controls**: Replaces raw Laplacian variance with `GaussianBlur(5×5, σ=1.0)` + `Sobel(3×3)` 99th-percentile edge gradient (`MIN_SHARPNESS_P99 = 62.0`), tightens stability (`MAX_JITTER_PX = 6.0`, `REQUIRED_STABLE_FRAMES = 4`), emits `'tilted'`, `'too-dark'`, and localized-hotspot `'glare'` hints, performs a `1×` silent re-capture if the full-res capture suffers shutter blur, and exposes `setTorch(Boolean)` + `setZoom(1.0 | 1.4)` (to mitigate close-focus field curvature / *banana blur* on large `1/1.3"` 50–200 MP sensors) via `OcrSession` to `ScanHud`.
