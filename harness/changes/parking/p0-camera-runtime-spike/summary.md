# Change: p0-camera-runtime-spike

- **ID:** p0-camera-runtime-spike
- **Status:** parked (2026-09-19, at the user's direction, to build the scan flow in the app)
- **Created:** 2026-09-19
- **Owner (lead):** Claude
- **One-line goal:** Prove on the physical SM-S928B that the on-device OCR path meets the ≤3 s sheet budget with zero pixels leaving native memory, and choose the camera and runtime lanes from measured evidence.
- **Blocker (if parked):** Deprioritised in favour of `scan-check-flow`; resume (do not fork) for the remaining items.

## Done with evidence (see `evidence/`)
- Model/device verification, class-order correction, backend source + live API review (tasks 1–4).
- `OcrEngine` port, `SheetEvidence`, decision logic with tests (6, 13-code).
- Native module `modules/ocr-native`: Kotlin preprocessing bit-exact vs the authors' pipeline, ORT FP32+XNNPACK/INT8 parity on device (7, 8).
- Runtime benchmark: FP32+XNNPACK 6 threads ≈ 110 ms per 72-cell sheet; ADR 0005 accepted for the inference lane (9).
- Geometry + QR on device stills: 6/7 images fully correct, ≈ 570 ms warm per 10 MP sheet (10, partial).

## Not done (remain open)
- Camera lane decision (CameraX vs VisionCamera) and live-frame success rate (11, 12) — CameraX inside our module is being built in `scan-check-flow`.
- Fallback rectification when a corner marker is hidden (10) — being done in `scan-check-flow`.
- Handwriting evaluation set and calibration of decision thresholds (5, 13, AC8) — needs the authors' `realdataset/` or own sheets.
- Zero-photo audit and repeated-scan soak (14), docs closure (15), independent review (16).
