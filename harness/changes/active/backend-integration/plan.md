# Plan: backend-integration

Order is chosen so each phase is independently shippable and only Phase C waits on the backend.

## Phase A — HTTP foundation (no backend answers needed)
- `src/adapters/http/client.ts`: fetch wrapper (base URL from `EXPO_PUBLIC_API_URL`, timeout via AbortController, JSON only, typed `ApiError {kind: network|timeout|http|invalid}`), header injection of `X-Teacher-UUID`. No fetch in UI.
- `src/ports/teacher-identity.ts` + adapter on expo-secure-store (new dep → check-deps/doctor).
- Response guards hand-written from the live spec (health, handshake, assignment metadata).
- Wire `HttpGateway` to the client; map errors → outbox `retryable` vs `permanent` (already in FSM).
- Payload conformance test vs `openapi-live-2026-09-19.json` (needs user OK — earlier interrupted).
- Tests: client (timeout, 5xx, 422, bad JSON), gateway mapping.

## Phase B — Handshake + real sync smoke (uses a throwaway teacher)
- Handshake with a **dedicated test UUID** (self-registers; note it in evidence), then one synthetic submission for a test assignment → verify insert, resend → update, `GET /submissions` shows one row. Ask the user before the first write to the live server.
- Timeout/offline/500 behaviour on the phone (airplane mode, Metro-less run).
- Network capture audit (AC6).

## Phase C — Bundle + roster (blocked by offline-bundle 500 / gaps 15, 16, 10)
- Ask backend to fix 500 (already in the question list); until then keep `offline-bundle.fixture.json`.
- `BundleRepository` port: fetch → validate → cache in SQLite (migration v2) → `evaluateSheet` catalog. Stale-while-offline; version key.
- `GET /classes`, `/classes/{id}/students` → roster cache → `matchStudent`.
- Replace demo catalog in composition root behind config; demo mode remains default with no env.

## Phase D — Read side (after C)
- Assignment analytics/gradebook: `GET /analytics/*` mapped to the 3 core metrics (drop `students_performance_table`, gap 12); gradebook.xlsx via share sheet. Owned by slice 7, listed here only for contract prep.

## Config
`EXPO_PUBLIC_API_URL` (base), `EXPO_PUBLIC_SYNC_URL` kept for the gateway; both unset → fake/demo. Never commit UUIDs.

## Risks
- Backend 500 / no auth: any UUID self-registers → treat identity as demo only.
- Payload 7.8 KB/sheet vs docs (gap 24): if backend needs all cells, fine; else trim.
- Live server is a demo host (duckdns), may be down: outbox must tolerate it (already tested).
