# ADR 0009 — Import tasks from a photo of a textbook exercise

- **Status:** Accepted (2026-09-20), narrow exception to ADR 0003
- **Context:** The backend has `POST /constructor/scan-task`: a photo of an exercise from a textbook or workbook is read by OCR and structured by YandexGPT into tasks (prompt, expected answer ≤ 12 letters, cell count, topic). Teachers asked to use it to build tests. ADR 0003 forbids sending camera images off the phone; that rule exists to protect **students' work**.
- **Decision:** Allow exactly one flow to send an image: *teaching material* → `scan-task`, and nothing else.
  - **Never** for student sheets: the sheet scanner and «Загрузить лист из файла» stay 100% on-device; the app has no code path that uploads them.
  - **Explicit consent:** the flow opens with a notice — the photo is sent to our server and processed by an external recognition service; photograph textbook pages only, never student work or people — and needs a tap on «Понятно, продолжить» before the camera/picker opens (remembered on the phone, shown again on request).
  - **No bytes in JS:** the photo is taken/picked by the system UI, uploaded by the native file-upload task (`File.upload`, multipart) straight from its file, then the temporary file is **deleted** in a `finally`. Nothing is base64-encoded, logged, cached or kept.
  - **AI output is untrusted:** results are shown for review (server answers can be wrong — e.g. a dative form spelled in the wrong vowel harmony); the teacher edits or drops each task, and only approved tasks are written to the bank (`POST /constructor/tasks`), never the raw scan (`save_to_bank=false`).
  - **Privacy claim stays accurate:** the app does not claim "nothing leaves the phone" for this flow; the notice says what leaves.
- **Consequences:** A third party (the recognition service behind the server) sees textbook photos; the backend's retention of uploaded images is unknown (ask the backend owners; recorded in contract-gaps). New dependency `expo-image-picker` (camera/library).
- **Verification:** device run with a synthetic exercise image; filesystem check that no image remains in the app cache after the flow; network capture shows one multipart request to `/constructor/scan-task` only.
