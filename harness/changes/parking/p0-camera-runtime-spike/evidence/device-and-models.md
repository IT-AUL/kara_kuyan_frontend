# Device and model verification — 2026-09-19

Commands run by the lead via `adb` and `shasum`.

## Device (`adb -s R5CY600QV9F shell getprop ...`)

| Property | Value |
|---|---|
| ro.product.model | SM-S928B |
| ro.soc.manufacturer | QTI |
| ro.soc.model | SM8650 (Snapdragon 8 Gen 3) |
| ro.board.platform | pineapple |
| Android / API | 16 / 36 |
| MemTotal | 11350704 kB |
| nproc | 8 |

## Models (`~/Downloads/iMe Desktop/`)

| File | Bytes | SHA-256 | Matches manifest |
|---|---|---|---|
| tatar_ocr_uppercase39_fp32.onnx | 3292452 | fafcbf65c2953a45ad5001764831ee7cd6c099d609dccfcc53ee5bc8866e322c | yes |
| tatar_ocr_uppercase39_int8.onnx | 844010 | 0dbbf6304d6e2053c8b6f4c9a978dbb426d4a5dd3c08b34dd883aa237cd68de9 | yes |
| finetuned_uppercase39.pth | 3312616 | b55481b407751ece8237c77bbfa6270cc3a271d73d04b3ef58a4c25ee01361d3 | yes |

Not yet verified: ONNX I/O names/shapes/opset (task 2), device thermal/battery state for benchmarks.
