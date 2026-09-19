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

### Class order (verified, index → char)

```
0 А   1 Б   2 В   3 Г   4 Д   5 Е   6 Ё   7 Ж   8 Җ   9 З
10 И  11 Й  12 К  13 Л  14 М  15 Н  16 Ң  17 О  18 Ө  19 П
20 Р  21 С  22 Т  23 У  24 Ү  25 Ф  26 Х  27 Һ  28 Ц  29 Ч
30 Ш  31 Щ  32 Ъ  33 Ы  34 Ь  35 Э  36 Ю  37 Я  38 Ә
```

This order is a versioned contract — app/native code must consume it from the manifest, never hardcode a second copy.

### Preprocessing contract (verified from integration guide)

Trim 3–5% border → aspect-preserving square pad (edge-median background) → grayscale, percentile-2/98 contrast stretch → `INTER_AREA` 64×64 → normalize `[-1,1]`, paper ≈ +1, ink ≈ −1.

## Unresolved

- Model version and license (not in artifacts; `model_version` is 0 and no semantic app version exists).
- Confidence flag threshold (0.65 backend vs 0.8 guide).
- Calibration: dataset, split, sample counts, confusion matrix — none supplied; the 96.97% Top-1 claim is unverified.
- Device benchmarks: no representative-device measurements exist.
- Static INT8 calibration artifact for the third benchmark lane.
