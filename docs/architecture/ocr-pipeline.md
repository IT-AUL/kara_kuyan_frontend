# OCR Pipeline

## Stages

1. **Stable frame (`ADR 0006` v0.4.2 Pro Document Capture)** — unified 4:3 `PreviewView` (`FIT_CENTER`) + `ImageAnalysis` (`1280×960`) + `ImageCapture` (`4200×3150`, `PREFER_HIGHER_RESOLUTION_OVER_CAPTURE_RATE`, `JPEG 95`), hybrid `CAPTURE_MODE_ZERO_SHUTTER_LAG` (when `isZslSupported` and torch OFF) / `CAPTURE_MODE_MAXIMIZE_QUALITY`, `Camera2Interop` (`EDGE_MODE_HIGH_QUALITY`, `NOISE_REDUCTION_MODE_FAST`), `+0.5 EV` white-paper exposure bias, active sheet-centroid & tap-to-focus `FocusMeteringAction` (`FLAG_AF | FLAG_AE`) with bounded pre-shutter convergence wait, noise-immune `Gaussian(5×5) + Sobel(3×3) P99` sharpness + tilt/darkness/hotspot-glare DQA gates, post-capture blur gate with `1×` silent retry, and teacher `1x / 1.4x` zoom + Torch HUD controls; no temp files, no JS pixel copies.
2. **Geometry** — ArUco corner detection (`DICT_4X4_50`; ids 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right), perspective rectification to a 2100×2970 px A4 canvas; fallback largest-quad contour. Rows/cells are located from each question's own marker plus grid-line detection, not fixed coordinates.
3. **QR decode** — student/assessment/variant identity; teacher fallback via «Изменить ученика».
4. **Cell crops** — 10×10 mm cells cut per the offline-bundle template geometry.
5. **Preprocessing — canonical C++20 `tatar_ocr_core` (`DanisGaleev/tatar_ocr@d27477b`, `third_party/tatar_ocr/native`)**:
   - Invoked via JNI (`tatar_ocr_jni` → `tatar_ocr::NativeBlankScanner::process_blank`) configured from `third_party/tatar_ocr/pipeline_spec.json` and `third_party/tatar_ocr/models/tatar_ocr_v4_handwritten39_int8.onnx` in `context.filesDir`.
   - Portrait orientation normalization: CameraX `ImageProxy` (JPEG / `YUV_420_888`) and gallery files normalize EXIF `TAG_ORIENTATION` / `rotationDegrees` upright in native memory before `process_blank`.
   - Sheet rectification (`NativeBlankScanner::rectify_sheet`): 60 px white border padding, 3-pass ArUco detection (`CORNER_REFINE_SUBPIX`, `C=7` → `C=12` → `CLAHE`), exact 4-corner perspective warp (`INTER_LANCZOS4`), similarity transform (`ArUco Similarity Transform`), balanced multi-marker RANSAC homography (`ArUco Multi-Marker Homography`), or `Document Contour Fallback`.
   - Grid localization (`NativeBlankScanner::extract_cells`): `MORPH_CLOSE` (`9×1`, `1×9`) + long-kernel `MORPH_OPEN` (`180×1`, `1×50`), 15 student-name cells, and 4–8 question rows (`8–12` cells/row) with canonical-anchor fallback when individual row markers have glare; crops directly from rectified BGR without destructive whole-sheet border erasure.
   - Per-cell segmentation & Stage-6 diacritic guard (`prepare_cell` + `build_prediction`): `4%` (`min 5 px`) inner trim → contrast-adaptive ink threshold → hollow-box & perimeter component filter (`is_border_component`) → top-diacritic re-attachment (`≤ 22 px`) → 4-criterion empty filter → `48 px` aspect-preserving glyph scale → 2nd/98th percentile stretch on `64×64` (`250` bg) → normalize `((x / 255) - 0.5) / 0.5` → deterministic `Ё → Е` and `Й → О/И` guard when no isolated top diacritic (`≥ 10 px`) exists.
6. **Batched inference** — `[N, 1, 64, 64]` float32 through C++ ONNX Runtime (`TatarOCRNetV3_MultiScale` `v4` inside `NativeBlankScanner::run_batch`).
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
