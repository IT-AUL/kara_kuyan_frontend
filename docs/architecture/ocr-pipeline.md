# OCR Pipeline

## Stages

1. **Stable frame** — camera produces a rectifiable frame; no temp files, no JS pixel copies.
2. **Geometry** — ArUco corner detection (`DICT_4X4_50`; ids 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right), perspective rectification to a 2100×2970 px A4 canvas; fallback largest-quad contour. Rows/cells are located from each question's own marker plus grid-line detection, not fixed coordinates.
3. **QR decode** — student/assessment/variant identity; teacher fallback via «Изменить ученика».
4. **Cell crops** — 10×10 mm cells cut per the offline-bundle template geometry.
5. **Preprocessing — authoritative version is the authors' source** (`docs/contracts/ocr-server-pipeline-reference.md`, ported in `tools/ocr-lab/preprocess_server.py`); the block below is the older integration guide, kept for history.
   **Older guide version — superseded.** The steps below are from the older integration guide. The authors' "updated block" (`docs/contracts/ocr-server-pipeline-reference.md`) differs: trim 8%, ink segmentation (`gray < median − 22`), frame-remnant filter, empty cell if ink area < 30 px, crop and scale the glyph to 46 px, centre on 64×64. Exact parity needs the authors' source (`contract-gaps.md` item 18). Guide version:
   5. **Preprocessing (exact, per cell):** 3–5% border trim → aspect-preserving square padding (edge-median background color) → grayscale + 2nd/98th percentile contrast stretch → `INTER_AREA` resize to 64×64 → normalize to `[-1, 1]` (paper ≈ +1, ink ≈ −1).
6. **Batched inference** — `[N, 1, 64, 64]` float32 through ONNX Runtime; all cells of a sheet in few batched runs.
7. **Top-K + confidence** — softmax over 39 logits; top-1 char + confidence, top-3 candidates retained for review.
8. **Answer-level comparison** — per-cell prediction vs `expected_cells` from the offline bundle → task-level status (Верно / Ошибка / Требует проверки / Не выполнено).
9. **HITL** — flagged tasks go to teacher review; overrides win.
10. **Discard buffers** — all pixel memory freed; nothing image-derived persists.

## Verified model facts (see `docs/contracts/model-manifest.md`)

| Property | FP32 | INT8 |
|---|---|---|
| Size | 3,292,452 B | 844,010 B |
| SHA-256 | `fafcbf65c2953a45ad5001764831ee7cd6c099d609dccfcc53ee5bc8866e322c` | `0dbbf6304d6e2053c8b6f4c9a978dbb426d4a5dd3c08b34dd883aa237cd68de9` |
| IR / opset | v8 / 17 | v8 / 17 |
| Input | float `[batch,1,64,64]` NCHW | float `[batch,1,64,64]` NCHW |
| Output | float logits `[batch,39]` | float logits `[batch,39]` |
| Graph | 20 nodes: 6 Conv, 7 ReLU, 2 MaxPool, 1 AveragePool, 1 Flatten, 2 Gemm, 1 BatchNorm | 66 nodes: `DynamicQuantizeLinear`, `ConvInteger`, `MatMulInteger` (dynamic quantization) |

PyTorch checkpoint `finetuned_uppercase39.pth`: ~3.2 MB, SHA-256 `b55481b407751ece8237c77bbfa6270cc3a271d73d04b3ef58a4c25ee01361d3`.

## 39-class alphabet (index order — versioned contract)

**Correction (2026-09-19, spike `p0-camera-runtime-spike`; confirmed by the authors' pipeline description, `docs/contracts/ocr-server-pipeline-reference.md`):** the integration guide lists `Ә` last (index 38). Measured on the supplied FP32 and INT8 models with 117 synthetic printed-letter cells, that order gives 2.6% accuracy (chance), while the order below gives 100%; the mapping is a consistent 39/39 shift across three fonts (evidence: `harness/changes/active/p0-camera-runtime-spike/evidence/class-order-finding.md`). Working hypothesis, pending confirmation on handwriting and with the model authors:

```
А Ә Б В Г Д Е Ё Ж Җ З И Й К Л М Н Ң О Ө
П Р С Т У Ү Ф Х Һ Ц Ч Ш Щ Ъ Ы Ь Э Ю Я
```

Tatar-specific indices: 1=`Ә`, 9=`Җ`, 17=`Ң`, 19=`Ө`, 25=`Ү`, 28=`Һ`. The guide's original list (`Ә` at 38; `Җ` 8, `Ң` 16, `Ө` 18, `Ү` 24, `Һ` 27) must not be used.

## Known conflicts and gaps

- **Threshold conflict:** OCR guide bands are ≥80% / 50–79.9% / <50%, but the backend handshake supplies `confidence_flag_threshold: 0.65`. Reconcile with backend preferences and device calibration before shipping defaults.
- **Blank-cell gap:** the model has no blank/invalid class; blank detection behavior is unspecified — needs a defined empty-cell heuristic.
- **Grayscale bug in reference Python:** the sample preprocessing claims BGR-or-grayscale input but indexes/pads as 3-channel BGR; grayscale input fails. Port the pipeline, don't copy it.
- **Input layout:** ONNX is NCHW float; the prose spec mentions TFLite — the mobile pipeline uses the ONNX artifacts; no TFLite layout assumptions.

## Benchmark matrix (P0 spike)

Compare on the user's physical phone, full sheet, cold and warm:

1. FP32 + XNNPACK (XNNPACK does not support the supplied `ConvInteger` INT8 graph).
2. Supplied dynamic INT8 on CPU.
3. Future calibrated static INT8 (QDQ/QOperator) — requires new calibration artifact.

**No unverified latency numbers.** External claims (e.g., 12 ms OCR, 93 ms total) are rejected as evidence; only instrumented device runs count toward the ≤3 s sheet budget.
