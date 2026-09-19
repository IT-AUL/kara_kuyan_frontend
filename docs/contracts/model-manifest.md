# Model Manifest

The ONNX artifacts embed no alphabet labels, normalization, version, or license. Those facts must live in a versioned manifest shipped with the app. This document proposes the manifest format and records currently verified values.

## Proposed manifest format (fields — proposed, not yet authoritative)

```yaml
manifest_version: 1                 # proposed
model:
  name: tatar-ocr-uppercase39       # supplied/document-derived (Tatar OCR Net) — not embedded metadata
  version: <string>                 # UNRESOLVED — not embedded in artifacts (model_version is 0; no semantic app version)
  license: <spdx-or-url>            # UNRESOLVED
  artifacts:
    - file: tatar_ocr_uppercase39_fp32.onnx
      sha256: <hex>                 # verified value below
      size_bytes: <int>
      quantization: fp32 | dynamic-int8 | static-int8
      producer: <string>            # verified below (pytorch 2.4.1 / onnx.quantize 0.1.0)
runtime:
  input_tensor: { name: input, dtype: float32, layout: NCHW, shape: [batch,1,64,64] }   # name verified
  output_tensor: { name: logits, dtype: float32, shape: [batch,39] }                    # name verified
  classes: <list of 39 chars>       # verified order below
preprocessing:                      # verified steps, see ocr-pipeline.md
  trim_pct: 3-5
  square_pad: edge-median-background
  contrast: percentile-2-98-stretch
  resize: INTER_AREA 64x64
  normalize:
    source_range: [0, 255]
    target_range: [-1.0, 1.0]
    polarity: { paper: 1.0, ink: -1.0 }
confidence:
  flag_threshold: <float>           # UNRESOLVED — 0.65 vs 0.8 conflict
  top_k_review: 3
benchmarks:                         # UNRESOLVED — device matrix pending
  device: <model>
  sheet_latency_ms: <int>
calibration:                        # UNRESOLVED — no dataset/split/matrix supplied
  dataset: <ref>
```

## Verified values

### Artifacts

| Field | FP32 | Dynamic INT8 |
|---|---|---|
| File | `tatar_ocr_uppercase39_fp32.onnx` | `tatar_ocr_uppercase39_int8.onnx` |
| SHA-256 | `fafcbf65c2953a45ad5001764831ee7cd6c099d609dccfcc53ee5bc8866e322c` | `0dbbf6304d6e2053c8b6f4c9a978dbb426d4a5dd3c08b34dd883aa237cd68de9` |
| Size | 3,292,452 B | 844,010 B |
| IR / opset | v8 / 17 | v8 / 17 |
| Checker | passes (ONNX 1.23.0) | passes (ONNX 1.23.0) |
| Quantization | none | dynamic (`DynamicQuantizeLinear`, `ConvInteger`, `MatMulInteger`) |
| Graph | 20 nodes, 20 initializers (6 Conv, 7 ReLU, 2 MaxPool, 1 AveragePool, 1 Flatten, 2 Gemm, 1 BatchNorm) | 66 nodes, 42 initializers |
| Input / output tensor names | `input` / `logits` | `input` / `logits` |
| Producer | `pytorch` 2.4.1 | `onnx.quantize` 0.1.0 |
| model_version / metadata | `0`; no semantic app version | `0`; `onnx.infer: onnxruntime.quant`; no semantic app version |

- `finetuned_uppercase39.pth`: 3,312,616 B, SHA-256 `b55481b407751ece8237c77bbfa6270cc3a271d73d04b3ef58a4c25ee01361d3`.

### Class order (measured on the models, index → char)

The order previously recorded here came from the integration guide (`Ә` at 38) and is **wrong for the supplied models**: on 117 synthetic printed cells it scores 2.6%, versus 100% for the order below (FP32 and INT8; evidence in `harness/changes/active/p0-camera-runtime-spike/evidence/class-order-finding.md`). Confirmed by the authors' pipeline description (`docs/contracts/ocr-server-pipeline-reference.md`); still to verify on handwriting.

```
0 А   1 Ә   2 Б   3 В   4 Г   5 Д   6 Е   7 Ё   8 Ж   9 Җ
10 З  11 И  12 Й  13 К  14 Л  15 М  16 Н  17 Ң  18 О  19 Ө
20 П  21 Р  22 С  23 Т  24 У  25 Ү  26 Ф  27 Х  28 Һ  29 Ц
30 Ч  31 Ш  32 Щ  33 Ъ  34 Ы  35 Ь  36 Э  37 Ю  38 Я
```

This order is a versioned contract — app/native code must consume it from the manifest, never hardcode a second copy.

### Preprocessing contract (verified from integration guide)

Trim 3–5% border → aspect-preserving square pad (edge-median background) → grayscale, percentile-2/98 contrast stretch → `INTER_AREA` 64×64 → normalize `[-1,1]`, paper ≈ +1, ink ≈ −1.

- On-disk check 2026-09-19 (`shasum -a 256`, `ls -l`): FP32, INT8 and `.pth` files in `~/Downloads/iMe Desktop/` match the sizes and SHA-256 values above. Graph inputs/outputs still to be confirmed by loading the models (spike task 2).

## Unresolved

- Model version and license (not in artifacts; `model_version` is 0 and no semantic app version exists).
- Confidence flag threshold (0.65 backend vs 0.8 guide).
- Calibration: dataset, split, sample counts, confusion matrix — none supplied; the 96.97% Top-1 claim is unverified.
- Device benchmarks: no representative-device measurements exist.
- Static INT8 calibration artifact for the third benchmark lane.
