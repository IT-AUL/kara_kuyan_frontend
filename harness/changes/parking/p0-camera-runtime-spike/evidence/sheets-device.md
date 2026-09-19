# On-device geometry + QR on still images — SM-S928B, 2026-09-19 (task 10, AC4 part)

Kotlin port of the authors' `rectify_sheet` / `extract_cells` (`SheetPipeline.kt`, OpenCV 5.0.0) + `classify_cell` + ORT FP32 XNNPACK (6 threads) + QR read two ways (OpenCV `QRCodeDetector`, bundled ML Kit 17.3.0) on JPEG stills of the synthetic sheet and the backend's real `blank.pdf` (`tools/ocr-lab/make_sheet_images.py`; 8.7–10.5 MP). 8 repeats per image (run 1 = cold, median of runs 2–8 = warm). Raw: `sheets-device.json`. Still images decoded from JPEG, **not** a camera stream (task 11).

| Image | Corner markers | Rows / cells per row | Rows correct | Name field | QR (OpenCV / ML Kit) |
|---|---|---|---|---|---|
| filled_clean (300 dpi raster) | 4/4 | 8 / [8,9,7,9,8,5,8,9] | **8/8** (incl. the deliberate ӨСТӘЛТӘН) | `ГАЛИЕВАМИРР` | both read |
| filled_photo1/2/3 (perspective, blur, uneven light, noise) | 4/4 | same | **8/8** each | `ГАЛИЕВАМИРР` | both read |
| live_blank_clean (backend PDF) | 4/4 | 4 / [8,8,8,8] | 4/4 empty | empty | both read (`n_q: 4`) |
| live_blank_photo1 | 4/4 | same | 4/4 empty | **`Г` (false positive in an empty cell)** — same as the desktop run | both read |
| filled_marker3_hidden (bottom-right marker covered) | 3/4 | 8 / [3,8,8,1,1,8,8,8] | **0/8 — failed** | garbage | not read |

Cell counts are answer length + the trailing empty cell (detected from grid lines, as on the server).

## Failure: authors' fallback does not work when one corner marker is hidden
With 3 of 4 corner markers the authors' path falls to the contour fallback; here it found no quadrilateral covering > 40% of the frame and ended in `direct-scaling` (plain resize) → every row misread. A product must never accept `direct-scaling` as a scan (it should keep the alignment state at "searching"). A better fallback is available and cheap: the template positions of every marker are known (corner markers and the per-question markers), so a homography can be fitted from all detected marker corners (RANSAC) even when one corner marker is covered. Not implemented yet.

## Stage timings, ms (cold / warm median), Kotlin on device, 10 MP photo-like JPEG
decode 73/66 · **rectify (marker detection on the full frame + Lanczos warp) 240/233** · locate cells 103/103 · preprocess (≈88 cells) 20/21 · inference (≈88 cells) 102/101 · QR OpenCV 10/10 · QR ML Kit 39/35 · **whole pipeline ≈ 570–590 warm** (clean 8.7 MP raster ≈ 475; empty real blank ≈ 330–460, no inference).
- Rectify is the largest stage and the obvious optimisation target (detect markers on a downscaled frame, refine at full size).
- OpenCV's `QRCodeDetector` (10 ms, no extra dependency) reads the rectified header as reliably as ML Kit (35 ms, +2.4 MB) on these sheets. Live frames untested — keep both until the camera test.

## Caveats
Synthetic sheets and one real blank; JPEG stills (no camera pipeline, no YUV conversion, no motion blur); debug build; USB-powered; single device. Corner-marker success rate over live frames still to be measured (task 11).
