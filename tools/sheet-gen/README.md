# sheet-gen

Fixture worksheet generator for the OCR spike (`harness/changes/active/p0-camera-runtime-spike`).

```bash
tools/ocr-lab/.venv/bin/python tools/sheet-gen/gen_sheet.py   # writes tools/sheet-gen/out/ (git-ignored)
tools/ocr-lab/.venv/bin/python tools/ocr-lab/e2e_desktop.py   # desktop end-to-end check
```

`fixtures/layout.json` and `fixtures/bundle.json` are committed copies for the native side.

**The layout is a fixture assumption, not a backend contract** (`docs/contracts/contract-gaps.md` item 15):
A4 210×297 mm, coordinates in mm from top-left. Corner ArUco (DICT_4X4_50) 18 mm at 8 mm inset, ids
TL 0 / TR 1 / BL 2 / BR 3 (as in the authors' pipeline description). Header text at the top, QR 26 mm at (170, 30) carrying the contract's
`qr_signature` (no `stu_id`; student name/code are printed text — gap 10). Eight question rows,
pitch 25 mm from y=64: prompt line, an 8 mm row marker (ids 11–18) at x=12, then contiguous 10×10 mm cells
starting at x=24 (answer letters plus one trailing empty cell). `sheet_filled.pdf` carries synthetic printed answers,
with question 2 deliberately written as ӨСТӘЛТӘН.

## Handwriting calibration sheets

`gen_calibration.py` makes 10 sheets (`out/calibration/sheet_cal_01..10.pdf`, merged in `calibration_sheets.pdf`) where every
row asks to copy a word (`Күчереп языгыз: WORD →`), so the expected letter of every cell is known (answer key:
`fixtures/calibration_bundles.json`; 403 letters, all 39 classes, extra weight on rare letters and confusable pairs).

1. Print `calibration_sheets.pdf` at **100% scale** (no "fit to page"), one-sided.
2. Copy each word into the cells, one **uppercase** letter per cell, with a normal pen; leave the trailing cell and the name field empty.
3. Photograph each sheet on a table in ordinary light, all four corner markers visible (any phone camera is fine).
4. Put the photos into `tools/ocr-lab/fixtures-private/photos/` (git-ignored; real handwriting is never committed).
5. `tools/ocr-lab/.venv/bin/python tools/ocr-lab/score_photos.py` → `tools/ocr-lab/out/calibration_report.md`
   (per-letter accuracy, empty-cell false positives, confidence vs correctness, threshold behaviour, false-accept rate).
   `--selftest` checks the script on synthetic degraded sheets.
