# OCR server pipeline and backend behaviour — from the authors' source

**Provenance:** `https://github.com/DanisGaleev/tatar_ocr`, commit `796601e43bad39ad8be1b24a8607fb8e83719b2e`, read on 2026-09-19 (public repo, **no licence file** — code is not copied here; behaviour and geometry facts are recorded, and our lab ports are reimplemented from reading). Also: `Без названия 1.pdf` (prose summary of the same pipeline). The repo's `openapi_specification.yaml` (SHA-256 `2dd20dbb…`) and `api_specification.md` are byte-identical to our `docs/contracts/` copies. The live server `https://tatar-ocr.duckdns.org` returned HTTP 502 on 2026-09-19.

The repo is a server that receives photos (`/ocr/scan-blank`, `/ocr/predict-box`). The mobile product is zero-photo (ADR 0003): we reuse the algorithms on-device and never call those endpoints.

## Sheet template (`backend/app/generators/pdf_blank.py`)
A4 210×297 mm. Rectified canvas = paper mm × 10 (2100×2970 px).
- Corner ArUco `DICT_4X4_50`, 14 mm, 6 mm from each edge: **id 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right**.
- QR 18 mm at (23, 6); payload `{"tid":…,"var":…,"page":1,"tot":1,"n_q":N}` — **no student id**.
- Student-name field: 16 cells of 9×9 mm, x = 47 mm, y ≈ 21.7 mm; **printed** into the cells when the PDF is requested with `student_id`, otherwise blank for handwriting.
- Up to 8 question blocks, origin y = 38 mm, pitch 28 mm. Left marker (ArUco id 11, 12, …) 11 mm at x = 6, y = block + 4. Prompt at x = 22. Answer cells 10×10 mm starting x = 22 mm, y = block + 9.5 mm (single-line prompt; +12 mm for multi-line), 1–12 cells.
- The offline bundle's `template_geometry` carries only format, dictionary, corner ids and cell size; **all coordinates are hardcoded on the server** (`blank_pipeline.py`) → the mobile client must hardcode the same constants, ideally under a template version.

## Pipeline (`blank_pipeline.py`, `BlankOCRScanner`)
1. **Rectify:** detect markers; if 0–3 all found, homography from marker 0's TL corner, marker 1's TR, marker 3's BR, marker 2's BL to canvas (60,60), (2040,60), (2040,2910), (60,2910); `warpPerspective` with `INTER_LANCZOS4`. Fallback: largest 4-point contour (Canny 50/180, `approxPolyDP` 2%, area > 40% of image) to the full canvas; last resort direct resize.
2. **Locate cells:** adaptive threshold (Gaussian, inv, 25, 10); vertical-line mask (open, kernel 1×35). Name row top y = argmax of vertical Sobel mean over y ∈ [200,245], x ∈ [470,1910]; 16 cells from x = 474, pitch 89.9, size 90×96. Question rows: detect markers on the rectified image, ids ≥ 11 sorted; row y = Sobel argmax over marker centre ±40 px, x ∈ [220,1020]; cell count = consecutive vertical dividers found at x = 220 + 100·c (window 20 px, y+15…y+80, > 100 px set), 1–12; cells `(220 + 100·j, y, 100, 95)`. Fallback anchors when no question markers: y = 474, 753, 1031, 1310, 1590, 1870, 2150, 2430, 8 cells.
3. **Classify cell (`classify_cell`)** — ported to `tools/ocr-lab/preprocess_server.py`: skip if cell < 10 px; trim `max(1, round(8% ))` per side (Python round = banker's); skip if inner < 8 px; `bg = median(inner)`; ink = `inner < bg − 22`; connected components (8-conn), keep area ≥ 18 and not an edge line (`w > 0.88·iw and h ≤ 3` or `h > 0.88·ih and w ≤ 3`); **empty if total kept ink < 30 px**; ink bbox + 2 px pad; glyph crop; scale = 46/(max side); new size `round`, clamped 1–60; `INTER_AREA` if shrinking else `INTER_LANCZOS4`; percentile 2/98 stretch **over the resized glyph** (`·240 + 10`); paste centred on a **64×64 canvas filled with 250**; `(x/255 − 0.5)/0.5`.
4. **Model:** softmax, top-3. Classes: `TATAR_UPPERCASE = АӘБВГДЕЁЖҖЗИЙКЛМНҢОӨПРСТУҮФХҺЦЧШЩЪЫЬЭЮЯ` (`Ә` at index 1) — matches `models/model_registry.json` and our measurement. Confidence colours: ≥ 80 green, 50–80 yellow, < 50 red.

## Models (`models/model_registry.json`)
`finetuned_uppercase39.pth` SHA-256 `b55481b4…` (same as ours); ONNX FP32/INT8 in the repo have the same sizes as ours. Reported: 94.28% accuracy on 2040 real handwritten cells (5 collection sheets, 24×17 grid), top-3 98.65%, after fine-tuning **on that same real dataset** (train/val split not stated — treat as optimistic). The integration guide's 96.97% and this 94.28% conflict; neither is an independent measurement. The repo holds `realdataset/` (~6100 files) — a possible evaluation set, **needs the authors' permission and a consent decision**.

## Backend behaviour in code (current implementation, not a documented contract)
- **`POST /submissions/batch-sync`:** for each item, look up `client_submission_uuid` (global, not per teacher); found → **update** fields (name, variant, checked_at, scores, grade, flags, results; `assignment_id`/`class_id` unchanged), else **insert**; a missing uuid gets a server-generated one (resend duplicates). One commit at the end: an exception fails the whole request (no per-item outcome). No ordering rule — last write wins, `checked_at` not compared. Response counts `inserted_count` / `updated_count`.
- **`POST /submissions`** always inserts (retry duplicates) — the client must use batch-sync with a stable uuid.
- `X-Teacher-UUID` is not checked on submissions; the handshake creates a teacher for any UUID. `final_grade` and scores come from the client (default grade 2); `confidence_flag_threshold` is the constant **0.65** set at teacher creation — an arbitrary default, not derived from data.
- Offline bundle marker ids: `10 + order_idx` (11, 12, …).
- **`generators/checker.py`:** normalises Latin homoglyphs to Cyrillic (A→А, B→В, C→С, E→Е, H→Н, K→К, M→М, O→О, P→Р, T→Т, X→Х, Y→Ү…); known confusions Ң/Н, Ә/А, Ө/О, Ү/У, Җ/Ж, Һ/Х; cell statuses `MATCH`, `MISMATCH`, `EMPTY_MISMATCH`, `EMPTY_MATCH`, `FLAG_OVERRIDDEN_BY_TEACHER` with `teacher_override` `CORRECT`/`WRONG`.
