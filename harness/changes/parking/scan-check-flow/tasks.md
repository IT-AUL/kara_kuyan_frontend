# Tasks — Scan → result → review → save

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Domain: evidence uses `isEmpty`; `evaluateSheet`, scoring, `matchStudent` + tests | `src/domain/**` | done (2026-09-19) | `pnpm test --runInBand`: 22 passed |
| 2 | Native: manifest asset, marker-template fallback, `SheetReader`, `CameraController`, `OcrCameraView`, permission + `captureSheet` | `modules/ocr-native/**` | done, compiled and installed (2026-09-19) | `BUILD SUCCESSFUL` (`:app:installDebug`) |
| 3 | Port + adapter + composition root + demo bundle | `src/ports`, `src/adapters`, `src/composition.ts`, `src/demo/*` | done | typecheck, lint clean |
| 4 | Scan session store; screens: scan (live camera, auto-capture), processing, student, result, review; check counter | `src/features/checking/**` | done, verified on device (2026-09-19) | `evidence/live-scan.md`: scan → processing → student → result → review → save run on SM-S928B |
| 5 | On-device run with a real camera: lock rate, capture → result latency (AC8) | evidence/ | partial: one sample 1725 ms tap→result; lock observed; more samples needed for median/p95 | `evidence/live-scan.md` |
| 6 | Zero-photo audit: files, network, logs during scans (AC9) | evidence/ | partial: files, gallery, logs clean; network capture not done | `evidence/live-scan.md` |
| 5b | Real paper + handwriting check; robust line-remnant filter; hidden-marker case fixed | `modules/ocr-native/**` | done (2026-09-19) | `evidence/paper-handwriting.md`, `sheets-device-after-fixes.json`: 10/11 handwritten letters top-1 (11/11 top-2), blank cells clean, hidden corner marker now 8/8 |
| 5c | Sheet validation by QR: catalog of known assignments; reject unreadable QR, unknown assignment/variant, task-count mismatch (no silent fallback); calibration bundles added to the demo catalog | `src/domain/scan/**`, `src/demo/**`, `src/composition.ts`, `src/features/checking/scanSession.ts` | done (2026-09-19) | unit tests: 26 passed (3 new for rejection + catalog); app starts and opens the scan screen on SM-S928B; rejection screens not yet exercised with a real wrong sheet |
| 7 | Docs: STATUS, CLAUDE.md, ADR for camera choice | docs | done | ADR 0006; STATUS and CLAUDE.md updated |
| 8 | Independent review | `reviews/review.md` | pending | — |

## Completion definition
- [ ] Every acceptance criterion in spec.md has evidence above.
- [ ] No open question was silently guessed.
- [ ] Review in `reviews/review.md` recorded.
