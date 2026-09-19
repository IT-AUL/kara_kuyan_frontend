# ADR 0007 — Import a sheet image from the phone

- **Status:** Accepted (2026-09-19)
- **Context:** Teachers want to check sheets that were photographed or scanned earlier (or shown on a screen) without using the live camera. ADR 0003 forbids persisting or transmitting frames and forbids pixels in JS.
- **Decision:** A native function `pickAndReadSheet()` opens the system document picker (`ACTION_OPEN_DOCUMENT`, `image/*`, no storage permission). The chosen file is read into native memory, decoded, scaled down if larger than 4200 px on its longest side, processed by the same `SheetReader` as camera frames, and released; the byte array is zeroed right after decoding. JS receives only the structured evidence JSON, exactly like `captureSheet()`.
- **Invariants:** the app never copies, caches, re-encodes or stores the picked file; the URI is not kept; nothing is logged beyond timings; the file that already exists on the phone is the teacher's own and is left untouched. Evidence flows through the same evaluation, QR validation and review path, so grading rules do not differ.
- **Consequences:** a photo of a sheet may already exist in the gallery or cloud backups — outside the app's control; the UI says so nowhere but the privacy note stays accurate for what the app does. Picker cancellation is a normal outcome (no error).
- **Verification:** device run with the synthetic filled sheet of a real backend test (`tools/ocr-lab/fill_live_sheet.py`), filesystem diff of the app data dir (no new image files), see the change's evidence.
