# Spec: backend-integration

## Goal
Real network path for: device handshake, offline bundle, class roster, submission sync, (later) analytics and gradebook export. Only documented fields are typed by hand from the live OpenAPI; no codegen until gaps settle.

## Non-goals
- Server-side OCR endpoints (`/ocr/*`, `/constructor/scan-task*`, legacy `/api/*`): never used (ADR 0003, no pixels leave the device).
- Auth beyond `X-Teacher-UUID` (gap 14). Constructor/print (slice 6).
- Sending demo data to the real backend without an explicit `EXPO_PUBLIC_SYNC_URL`.

## Acceptance criteria
1. Handshake: a teacher UUID is created once, stored in SecureStore, sent as `X-Teacher-UUID`; handshake response (incl. `confidence_flag_threshold`) parsed defensively.
2. Offline bundle for an assignment is fetched, validated (zod-like guard), cached in SQLite by `assignment_id+variant+version`, and feeds `evaluateSheet`; app scans work with no network after the first fetch.
3. Roster fetched per class and cached; `matchStudent` uses it instead of demo data.
4. `HttpGateway` sends one submission per request to `POST /api/v1/submissions/batch-sync`; idempotent re-send confirmed against the real server (same uuid → `updated_count`, no duplicate); failures map onto the outbox FSM (network/5xx → retry with backoff, 4xx/422 → `failed` with reason, no infinite retry).
5. Payload conformance test: `buildSubmission` output validates against the live OpenAPI schema.
6. Privacy: network capture of a full scan+sync shows no image bytes; only JSON.
7. Failure modes verified on the phone: server down, offline, 500, slow (timeouts), airplane mode toggling.
8. Every phase has evidence in `evidence/`; docs (`offline-sync.md`, `contract-gaps.md`, `STATUS.md`) updated.
