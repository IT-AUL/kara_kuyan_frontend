# ADR 0003: Zero-photo on-device processing

**Status:** Accepted

## Context

Worksheets contain student handwriting and names. The product promise: camera images never leave the teacher's phone — only structured results sync.

## Decision

All pixel handling — ArUco rectification, QR decode, cell crops, OCR inference — runs on-device in process-local native buffers and is discarded; buffers are never intentionally persisted or exposed to JS. No image bytes reach the filesystem, network, JS, logs, crash reports, or automated analytics/screenshot/session-replay capture. Submissions carry only characters, statuses, confidences, scores (~1–2 KB/sheet). Android OS screenshots/screen recording on camera and result surfaces are an open decision (`FLAG_SECURE` vs demo needs) — not currently blocked.

## Consequences

- Positive: strongest possible privacy story; no server-side image liability; offline grading by construction.
- Negative: all CV/OCR work must happen natively (more complex pipeline); no server fallback for hard cases — review queue absorbs uncertainty.
- Verification: filesystem/network/log evidence gates in `docs/architecture/security-privacy.md` and `docs/delivery/quality-gates.md`.

> **Amendment (2026-09-20):** [ADR 0009](0009-textbook-exercise-photo-import.md) allows one explicit, consented upload of a photo of *teaching material* (textbook exercise) to `POST /constructor/scan-task`. Student sheets are unchanged: they never leave the phone.

