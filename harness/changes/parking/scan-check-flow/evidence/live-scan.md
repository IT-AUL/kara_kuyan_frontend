# Live scan on the device — SM-S928B, 2026-09-19

The real flow was run on the phone with the live camera pointed at the fixture sheet shown on a monitor (`sheet_filled.pdf`): scan (auto-capture) → processing → student → result → task review → save. Screens were captured with `adb screencap`; logs read with `adb logcat`.

## What was observed
- **Camera + alignment:** native preview in the scan screen; logcat `OcrCamera` lines showed `corners=4 sharp≈2100 jitter 1–6 px … phase=locked`, after which the capture fired **by itself** and the app moved on.
- **Capture → result:** `[scan] captured+evaluated in 1725 ms; stages {rectify 289, locate 105, preprocess 69, infer 107, qr 99} ms; method marker-homography` — the still needed the template-marker fallback (a corner marker was not detected), which worked.
- **Student:** the name field was read (with stray letters from screen moiré) and matched to «Галиев Амир Р. · 7A-014» automatically by the LCS matcher; manual selection from the roster also worked.
- **Result screen:** after the final run **7 из 8 · 87% · Оценка 5**, `Верно` on the correct tasks, task 2 (ӨСТӘЛТӘН) `Ошибка`, one task flagged for review; the flagged task's review screen showed expected vs written cells with the extra letter highlighted; «Засчитать ответ» updated the score and returned to the result; «Сохранить и сканировать дальше» returned to the checking tab with the counter 18 → **19 из 25**.
- **Fixes found and made while testing:** OpenCV native library not loaded in the camera path; `takePicture` and `unbindAll` must run on the main thread; camera must not stop while a capture is in flight; stability threshold relaxed for hand tremor; name matching made tolerant to stray letters; a speck-size rule for cells that should stay blank (`strayInkMaxPixels`, proposed) cut the flagged tasks from 3 to 1 on the moiré-prone monitor scan.

## Zero-photo checks (AC9) — partial
- No new image files in the app's `files/` or `cache/` in the last 20 minutes; the only image files under `files/ocr-lab/` are the synthetic fixtures/test sheets I pushed. `cache/mat-debug-*.log` are 0 bytes.
- No new files in the gallery (`/sdcard/DCIM/Camera` newest is from 2026-09-18); the capture uses an in-memory `takePicture` callback.
- `adb logcat`: 0 lines mentioning base64 / `data:image`.
- **Not done:** network capture (bytes sent by the app) — the counter lookup returned nothing; remaining to do with a proper capture. No SQLite/backend code exists yet, so no route for image bytes to the network, but this is not measured.

## Caveats
- One latency sample (1725 ms tap→ready, includes the ImageCapture still, decode, native read and JS evaluation); several more are needed for median/p95. The 3 s budget is met by this sample.
- Scanned from a monitor (glare/moiré), not paper; handwriting untested; thresholds are proposals. Only the accept path of task review and one scan were driven end to end; reject path and the `NOT_ALIGNED` error screen were not exercised on a real hidden-corner sheet.
