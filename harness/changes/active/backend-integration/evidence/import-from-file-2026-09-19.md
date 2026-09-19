# Import a sheet from the phone — device run 2026-09-19 (SM-S928B)

ADR 0007. Sheet: synthetic filled «Кр5» (`TAT-2026-QDCE7`, variant 1) made from the backend's own `blank.pdf` by `tools/ocr-lab/fill_live_sheet.py`, name field `РАХМАТУЛЛИНТИМУР`, deliberate error ӨСТӘЛТӘН in task 2; file pushed to `/sdcard/Download` and chosen through the system picker.

Result on the phone (screens + `ReactNativeJS` log): rectified `aruco-4-point`; native stages rectify 143 ms, locate 67, preprocess 50, infer 90, qr 8 (≈0.36 s); QR → assignment Кр5, variant 1; **name read `РАХМАТУЛЛИНТИМУР` → student «Рахматуллин Тимур» matched from the roster**; result 3 из 5 (60%): task 1 correct, task 2 error (ӨСТӘЛТӘН, as planted), 1 task to review. Not saved (no write to the backend from this run).

## Found on the way (fixed)
The backend's new blank has **8 mm name cells (pitch 80 px)**, the old one 9 mm (89.9 px). The fixed grid read the printed cell borders as letters (`ЯААА…`). Name cells are now found from the printed vertical lines in a strip under the top border (handwritten strokes do not reach it), cells are square (pitch × pitch), old fixed grid remains the fallback. Desktop reference: empty name on new blank, old blank and 3 degraded copies; filled name read exactly on clean + 3 degraded copies. This is template-version drift the bundle does not signal (contract-gaps 15, 27).

## Not verified
Filesystem diff of app data (no new image files) and a network capture for this path; saving the imported sheet; picking a photo taken by a phone camera (only a synthetic render was used).
