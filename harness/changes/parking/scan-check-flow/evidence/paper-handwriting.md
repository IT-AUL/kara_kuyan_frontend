# Real paper + handwriting — 2026-09-19

Photo supplied by the user (`images/1.jpg`, 1500×2000): the backend's real `blank.pdf` (TAT-2026-Q1, variant 1, 4 questions) printed on paper and filled by hand. Ground truth as read by eye from the photo (to be confirmed by the writer): Q1 `А Б Ә Й К А`, Q2 `Ө Х Ч Ш У`, Q3–Q4 and the name field left empty.

## Desktop reference (bit-exact with the Kotlin preprocessing) — top-3 per cell
| Cell | Written | Top-1 (p) | Top-2 (p) |
|---|---|---|---|
| Q1·1 | А | А 0.95 | Д 0.03 |
| Q1·2 | Б | Б 0.99 | Ь 0.01 |
| Q1·3 | Ә | Ә 1.00 | Э 0.00 |
| Q1·4 | Й | Й 1.00 | И 0.00 |
| Q1·5 | К | **Ж 0.64** | К 0.28 |
| Q1·6 | А | А 0.69 | Л 0.10 |
| Q2·1 | Ө | Ө 0.75 | О 0.20 |
| Q2·2 | Х | Х 0.81 | Ж 0.14 |
| Q2·3 | Ч | Ч 1.00 | Ң 0.00 |
| Q2·4 | Ш | Ш 1.00 | Щ 0.00 |
| Q2·5 | У | У 0.61 | Ү 0.35 |

- **Top-1 correct 10/11; the written letter is in the top-2 for 11/11.** All 27 blank answer cells were detected as empty.
- With the *proposed* thresholds (p ≥ 0.8 and lead ≥ 0.3; 0.5 for confusable pairs) and if these had been the expected letters: 7 accepted automatically, 4 sent to review (К, А, Ө, У — all correct or near), **0 wrongly accepted**. Several correct letters sit at p = 0.6–0.75, so 0.8 sends about a third of letters to review; one sheet of 11 letters is an anecdote, not a calibration.

## Geometry and QR on the phone
Rectification `aruco-4-point` with 4/4 corner markers, 4 rows × 8 cells found, QR `{"tid":"TAT-2026-Q1","var":1,"page":1,"tot":1,"n_q":4}` read. **OpenCV's QR detector failed on the device for this paper photo; bundled ML Kit read it** (the reader falls back to ML Kit) — keep both. Device text: Q11 `АБӘЙЖА`, Q12 `ӨХЧШУ`, Q13/Q14 empty; warm whole pipeline ≈ 317 ms on this 3 MP photo.

## Defect found and fixed: printed lines read as letters in the name field
5 of the 16 empty name-field cells produced letters with 218–320 px of "ink" (real letters here: 295–577 px). Cause: the authors' edge-line filter only drops components ≤ 3 px thick; on the photo the printed 0.4 mm cell lines are 4–5 px thick, so a line strip survived as a letter. Fix in the app path (`CellPreprocessor`, `tolerantLines = true`): thin (≤ 8 px), long (> 70% of the cell) strips count as line remnants. Result: name-field false cells 5 → 2 of 16 (`УЭ` on the device), all 11 real letters unchanged. The authors' exact rule stays for the golden parity test. The same change fixed the earlier failure with a hidden corner marker: `filled_marker3_hidden.jpg` now uses `marker-homography` and reads 8/8 rows (it was 0/8 with direct scaling).

## Caveats
One writer, one sheet, 11 letters; the name field was not filled by hand; ground truth read by eye.
