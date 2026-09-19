# Finding: model class order differs from the OCR guide — 2026-09-19

## Method
`tools/ocr-lab/gen_fixtures.py` renders 39 uppercase letters × 3 fonts (Onest 700, Onest 500, Noto Sans 400; random rotation ±5°, background 200–245, grid-line artifacts, blur), 117 cells, runs the reference preprocessing (`preprocess.py`) and both ONNX models under ONNX Runtime 1.30.0 (CPU). Model files verified by SHA-256 (see `device-and-models.md`).

## Result (`golden-generation.txt`)
| Model | Accuracy, guide order (Ә last) | Accuracy, observed order (Ә at 1) |
|---|---|---|
| FP32 | 0.026 (chance = 1/39) | 1.000 |
| INT8 | 0.026 | 1.000 |

FP32 vs INT8 argmax agreement: 1.000. Mean top-1 probability 0.997 with the guide order in use, i.e. the model is confident and consistent — only the label mapping was wrong.

## Mapping observed (printed letter → predicted index under the guide order)
Label index L (guide order) → predicted index: А 0→0; every letter 1..37 → L+1; Ә 38→1. Identical for all three fonts, all 39 predictions distinct. So the model's index 1 is Ә and later letters follow the natural Tatar alphabet.

## Caveats
- Synthetic printed letters only; handwriting has not been tested (task 5 data pending). A pure index permutation cannot depend on handwriting style, so this is a strong indication, not yet a confirmation.
- Needs confirmation from the model authors; the manifest should ship the authoritative order.

## Impact
Any code using the guide's order mislabels nearly every letter (all except А) and would turn correct answers into errors. The decision logic already takes the alphabet from `SheetEvidence`, not from a constant.

## Update — authors' description confirms it
The authors' pipeline PDF (`docs/contracts/ocr-server-pipeline-reference.md`, page 4) lists the classes as `А Ә Б В Г Д Е Ё Ж Җ З …` — `Ә` at index 1 — matching the order measured above. Remaining check: handwriting.
