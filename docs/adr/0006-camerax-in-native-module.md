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
