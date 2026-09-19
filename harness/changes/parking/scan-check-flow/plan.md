# Plan — Scan → result → review → save

## Approach
Keep the existing screens and replace their data source:
- **Native (`modules/ocr-native`)**: CameraX preview as an Expo native view; ImageAnalysis (Y plane → marker count, sharpness, stability) drives alignment events; ImageCapture takes a still held only in memory (decoded, read, zeroed); `SheetReader` turns it into structured evidence; rectification uses the authors' 4-marker homography, with a marker-template homography fallback when a corner marker is hidden; the contour/direct-scaling fallbacks are rejected (`NOT_ALIGNED`).
- **Domain (`src/domain`)**: `evaluateSheet` (bundle × evidence → per-task status via `evaluateQuestion`), `matchStudent` (name field → roster), scoring with teacher overrides. Pure TS, unit-tested.
- **Port/adapter**: `OcrEngine` port (+ permission) implemented by `src/adapters/ocr-native`; wired only in `src/composition.ts`.
- **Feature (`src/features/checking`)**: an in-memory `scanSession` store (`useSyncExternalStore`) shared by the scan → processing → student → result → review screens.
- Offline bundle: the committed fixture behind `demoBundle` (live endpoint 500).

Rejected: VisionCamera (extra Nitro/worklets, pixels visible to a JS plugin path); persisting results (slice 5); calling the backend OCR endpoints (violates zero-photo).

## File ownership
| Area | Writer |
|---|---|
| `modules/ocr-native/**` | Claude |
| `src/domain/ocr/**`, `src/domain/scan/**`, `src/domain/roster/**` | Claude |
| `src/ports/ocr-engine.ts`, `src/adapters/ocr-native/**`, `src/composition.ts`, `src/demo/demo-bundle.ts`, `src/demo/offline-bundle.fixture.json` | Claude |
| `src/features/checking/**` | Claude |
| `harness/changes/active/scan-check-flow/**`, docs (`STATUS.md`, `CLAUDE.md`, ADRs) | Claude |

## Risks
- Live-camera marker detection may be less reliable than on stills → measure lock rate; keep manual capture.
- Sharpness/stability thresholds are guesses → tune on device.
- Screen glare when scanning from a monitor differs from paper → final check on a printed sheet.
- No handwriting data: recognition quality on real handwriting is unmeasured; decision thresholds stay "proposed".

## Deviations
_Recorded during execution._
