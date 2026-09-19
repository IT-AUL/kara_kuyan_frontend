# Security & Privacy

## Data classification

| Data | Class | Handling |
|---|---|---|
| Camera frames / cell crops | Restricted (student handwriting) | Native memory only; discarded after processing; never persisted or transmitted |
| Student names, codes, rosters | PII | SQLite on device; synced to backend over TLS |
| Grades, answers, OCR evidence | Student performance data | SQLite; synced as structured JSON only |
| Teacher UUID (`X-Teacher-UUID`) | Credential | Stored in SecureStore (preferred) or equivalent protected storage; sent only over TLS to the backend |
| Offline bundle (answer key) | Sensitive content | SQLite/app-private storage; teacher-device only |

## Zero-photo invariants

- Camera frames and any pixel-derived buffers live only in the native module's memory, for the duration of one scan's processing.
- No image bytes may reach: SQLite, the filesystem, the network, JS (no base64/ArrayBuffer handoff), logs, crash reports, analytics events, or automated screenshot/session-replay capture.
- Submission payloads contain only characters, statuses, confidences, and scores (~1–2 KB/sheet).
- Sentry (if adopted): screenshots and session replay disabled, PII scrubbing configured, no image attachments — adopt-on-evidence per roadmap.
- **Open decision — OS-level capture:** Android OS screenshots and screen recording on camera and result surfaces are not currently blocked. `FLAG_SECURE` would prevent them but may interfere with demo recording; decision pending. Do not claim OS-level screenshots are blocked.

## In-memory lifetime

- Frame buffers are allocated in native code as process-local buffers, freed on pipeline completion or failure path, and are never intentionally persisted or exposed to JS.
- Processing runs on the device's own surfaces; no third-party CV service (ML Kit on-device barcode only, bundled model — no cloud API).

## Local storage risk

- SQLite holds PII (names, grades). OS-level app sandboxing is the boundary; **encryption at rest is not implemented** and must not be claimed. If a threat review requires it, that's an explicit later decision.
- Least retention: demo data and checked results are kept only as needed for the teacher's workflow; no hidden telemetry copies.

## Transport

- All backend traffic over HTTPS/TLS; the `X-Teacher-UUID` header is the only credential and never appears in URLs or logs.
- `X-Teacher-UUID` is a bearer-equivalent static identifier — acceptable as a demo identity, not strong production authentication. Production auth, rotation, and revocation are an unresolved backend security requirement (see `docs/contracts/contract-gaps.md`).

## Testable evidence

- **Filesystem:** run a scan; assert zero new image artifacts anywhere in app-writable storage.
- **Network:** capture traffic during scan + sync; assert no image bytes in any request body or header.
- **Logs/crash:** grep app logs and a forced-crash report for pixel data or base64 blobs.
- These checks are part of the privacy quality gate in `docs/delivery/quality-gates.md`.
