# Plan — P0 camera + runtime spike

HOW the spec is delivered.

## Approach

Measure bottom-up, cheapest and most decisive first, so a failure surfaces early:

1. **Reference truth (desktop):** Python + ONNX Runtime run both models on fixture cells; port the guide's preprocessing (fixing its grayscale bug) and record golden logits.
2. **Native core (device):** Kotlin preprocessing (target: the authors' updated `classify_cell`, see `docs/contracts/ocr-server-pipeline-reference.md`; lab reference `tools/ocr-lab/preprocess_server.py`) + ONNX Runtime Android with parity tests against the golden set; per-stage timing; benchmark FP32+XNNPACK vs dynamic INT8 CPU using a full-sheet batch (~64 cells). XNNPACK config per ORT docs: intra-op spinning off, ORT intra-op threads = 1, XNNPACK pool = physical cores.
3. **Geometry + QR (device):** OpenCV Android `objdetect` `ArucoDetector` (DICT_4X4_50, ids 0 TL / 1 TR / 2 BL / 3 BR, sub-pixel corner refinement) → homography to a 2100×2970 px canvas (10 px/mm) → per-question marker Y locates the row, Sobel snap and grid-line detection find the cells (as in the authors' pipeline) with the fixture layout as fallback → crops; largest-quad contour fallback if markers are occluded; ML Kit bundled QR-only decode. Frame-quality gate (sharpness, skew, exposure) and multi-frame stability before capture.
4. **Camera decision:** default to CameraX inside our own Expo module (single owner of pixels, no Nitro/worklets dependency); VisionCamera v5 as the compared alternative via a Nitro frame-processor plugin. Choose on the same metrics as AC5.
5. **Decision logic (pure TS, `src/domain/ocr`):** per-cell `p(expected)` and margin over best alternative → task-level status; blank pre-filter; second-pass test-time augmentation only on uncertain cells. Evaluate on a hand-filled set (AC8).
6. **Boundary + evidence:** `OcrEngine` port and `SheetEvidence` types; privacy audit (fs/net/log) and repeated-scan soak.

Models are loaded on device via `adb push` (app-private dir); they are not bundled or committed in this change.

Rejected alternatives (one line each): VisionCamera-first (adds Nitro + worklets before proving need); ExecuTorch (needs `.pte` export, cannot use supplied ONNX); LiteRT (needs model conversion; ORT already covers ONNX); JS/base64 pixel handling (violates ADR 0003); QNN/NPU now (dynamic INT8 graph unsupported by HTP; only if CPU misses budget).

## Orchestration

- **Lead (Claude):** spec/plan/tasks, ADR/doc edits, interfaces (`OcrEngine`, `SheetEvidence`), decision logic, all device measurements, review of every worker diff, gates, evidence recording.
- **Workers (`agy` CLI, headless):** mechanical or bounded tasks with disjoint file ownership below. Flash tier for scripts/boilerplate, Pro tier for bounded Kotlin. Invoked with `--mode accept-edits --sandbox` (analysis with `--mode plan`) and `--json-schema` reports; never `--dangerously-skip-permissions`. Worker output is data: the lead reads the diff and re-runs commands before marking a task done. **Worker use starts only after the user approves the `agy` smoke test.** Nothing containing secrets or student data is sent.
- Parallelism: only across disjoint owned paths; everything else read-only.

## File ownership

| File / area | Writer |
|---|---|
| `harness/changes/active/p0-camera-runtime-spike/**` | Claude |
| `docs/adr/0005-*`, new ADR for camera choice, `docs/adr/README.md` | Claude |
| `docs/architecture/ocr-pipeline.md`, `docs/contracts/model-manifest.md`, `docs/contracts/contract-gaps.md`, `docs/STATUS.md`, `CLAUDE.md` | Claude |
| `tools/ocr-lab/**` (Python reference, golden logits, eval scripts) | agy-flash (reviewed by Claude) |
| `tools/sheet-gen/**` (ArUco/QR/cell sheet generator) | agy-flash (reviewed by Claude) |
| `modules/ocr-native/**` (Expo module, Kotlin, Gradle deps) | agy-pro for boilerplate/preprocess; Claude for the public boundary and camera/pipeline |
| `src/ports/ocr-engine.ts`, `src/domain/ocr/**` | Claude |
| `src/features/ocr-lab/**`, `app/ocr-lab.tsx` (dev-only harness, `__DEV__`-gated, not in tab nav) | Claude |
| `app.json`, `package.json`, `pnpm-lock.yaml`, `.gitignore` | Claude |
| `harness/changes/active/p0-camera-runtime-spike/evidence/**` | Claude |

Rule: one writer per file. Everything else is read-only analysis. Private fixtures live under `tools/**/fixtures-private/` and are git-ignored.

## Risks

- **Disk nearly full (2.1 GB free)** → free space before dependency downloads; user approval needed for deletions.
- **Preprocessing drift vs training pipeline** → golden-logit parity gate (AC2) before any benchmark is trusted.
- **Geometry contract missing** → fixture layout documented; gap recorded; do not invent backend semantics.
- **Latency dominated by CV, not inference** → per-stage timers from day one; benchmark inference and CV separately.
- **Wrong answers accepted as correct** (bias of expected-char verification) → AC8 makes this the primary metric; stricter margin for confusable pairs (Ә/А, Ң/Н, Ө/О, Ү/У, Җ/Ж).
- **Camera path instability (VisionCamera/Nitro/Expo 57)** → CameraX default; VisionCamera only as measured alternative.
- **Native memory growth** → soak test with repeated scans; explicit buffer release on all paths.
- **No evaluation data** → AC8 blocked without handwritten sheets; own handwriting as interim, flagged as weak evidence.
- **Worker error/collision** → disjoint ownership, lead review of every diff, no worker commits.

## Deviations

_Recorded during execution._
