# OCR Pipeline

## Stages

1. **Stable frame** — camera produces a rectifiable frame; no temp files, no JS pixel copies.
2. **Geometry** — ArUco corner detection (`DICT_4X4_50`, ids 0–3), perspective rectification to A4 template space.
3. **QR decode** — student/assessment/variant identity; teacher fallback via «Изменить ученика».
4. **Cell crops** — 10×10 mm cells cut per the offline-bundle template geometry.
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

```
А Б В Г Д Е Ё Ж Җ З И Й К Л М Н Ң О Ө П
Р С Т У Ү Ф Х Һ Ц Ч Ш Щ Ъ Ы Ь Э Ю Я Ә
```

Tatar-specific indices: 8=`Җ`, 16=`Ң`, 18=`Ө`, 24=`Ү`, 27=`Һ`, 38=`Ә`.

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
