# OCR Pipeline

## Stages

1. **Stable frame** — camera produces a rectifiable frame; no temp files, no JS pixel copies.
2. **Geometry** — ArUco corner detection (`DICT_4X4_50`; ids 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right), perspective rectification to a 2100×2970 px A4 canvas; fallback largest-quad contour. Rows/cells are located from each question's own marker plus grid-line detection, not fixed coordinates.
3. **QR decode** — student/assessment/variant identity; teacher fallback via «Изменить ученика».
4. **Cell crops** — 10×10 mm cells cut per the offline-bundle template geometry.
5. **Preprocessing — authoritative `v4` version (`DanisGaleev/tatar_ocr@7a5cce4`, `blank_pipeline.py`)**:
   - Sheet rectification: 60 px white border padding, 3-pass ArUco detection (`CORNER_REFINE_SUBPIX`, `C=7` → `C=12` → `CLAHE`), exact 4-corner perspective warp (`INTER_LANCZOS4`), balanced multi-marker RANSAC homography, or `estimateAffinePartial2D` similarity fallback when corner markers are shadowed.
   - Grid localization & border suppression: `MORPH_CLOSE` (`9×1`, `1×9`) + long-kernel `MORPH_OPEN` (`180×1`, `1×50`), 15 student-name cells, dynamic 8–12 question cells, and non-destructive perimeter border suppression (`suppressGridBorders`) protecting the inner `84%` safe core of every cell.
   - Per-cell segmentation (`CellPreprocessor`): `4%` (`min 5 px`) inner trim → contrast-adaptive ink threshold (`22.0` / `16.0` / `max(7.0, 0.32 * Δ)`) → hollow-box & perimeter remnant filter → top-diacritic re-attachment (`≤ 22 px` above body) → 4-criterion empty filter (`ink < 35 px`, `coreFrac < 0.005`, `Blackhat P98 < 10 & contrast < 25`, top-band intrusion) → aspect-preserving scale to **`48 px`** (`75%` occupancy) → 2nd/98th percentile contrast stretch → center on `64×64` (`250` paper background) → normalize `((x / 255) - 0.5) / 0.5`.
   - Stage 6 post-filter: deterministic geometric `Ё`/`Й` constraint — demotes `Ё → Е` and `Й → О/И` when no isolated top diacritic (`≥ 10 px`) exists above the main glyph body.
6. **Batched inference** — `[N, 1, 64, 64]` float32 through ONNX Runtime (`TatarOCRNetV3_MultiScale` `v4`, adaptive big.LITTLE threads + background warmup).
7. **Top-K + calibrated `τ = 85%` threshold** — softmax over 39 logits; non-empty cells with `confidence < 0.85` are marked `uncertain` (yellow spot-focus) with Top-3 candidates retained for 1-tap teacher selection; `confidence >= 0.85` cells are auto-accepted as `match` or confirmed `mismatch`.
8. **Answer-level comparison** — per-cell prediction (or 1-tap teacher cell fix) vs `expected_cells` from the offline bundle → task-level status (Верно / Ошибка / Требует проверки / Не выполнено).
9. **HITL** — Zero-Touch sheets (`0` uncertain cells) save in 1 gesture; uncertain cells resolve in 1 tap from Top-3 candidates or whole-card swipe.
10. **Discard buffers** — all pixel memory freed; nothing image-derived persists.

## Verified `v4` model facts

| Property | FP32 (`tatar_ocr_v4_handwritten39_fp32.onnx`) | INT8 (`tatar_ocr_v4_handwritten39_int8.onnx`) |
|---|---|---|
| Architecture | `TatarOCRNetV3_MultiScale` (`1×1, 3×3, 5×5, 7×7` DWConv + SE `r=8`) | Dynamic `QUInt8` (`DynamicQuantizeLinear` + `ConvInteger`) |
| Size | 3,782,792 B (~3.61 MB) | 1,024,619 B (~0.98 MB) |
| SHA-256 | `b9cbbfd045921fa7f2e92bf54d2eaf84c9266075ad09a0d0b175031d8a948aa5` | `656096ed97d25cfdd07390f292a7b9a9f838481adf126587e40dccae25c9f191` |
| Opset | 14 | 14 |
| Input | float `input` `[batch, 1, 64, 64]` NCHW | float `input` `[batch, 1, 64, 64]` NCHW |
| Output | float `output` `[batch, 39]` | float `output` `[batch, 39]` |

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
