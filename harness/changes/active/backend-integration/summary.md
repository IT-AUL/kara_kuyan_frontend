# Change: backend-integration

- **ID:** backend-integration
- **Status:** active (user directed on 2026-09-19 to proceed against the current backend as-is; `durable-outbox` parked with leftovers: check-deps/doctor re-run, real scan→save on phone, failed-state UI on device)
- **Created:** 2026-09-19
- **Owner (lead):** Claude
- **One-line goal:** Connect the app to the live backend `https://tatar-ocr.duckdns.org` (roadmap slice 3 + real sync of slice 5) without breaking zero-photo, keeping the app fully working offline with the fake gateway.
- **Blocker (if parked):** live `offline-bundle` returns HTTP 500 (contract-gaps 21); backend answers to gaps 15–24 pending. Phases A–B do not need them.

Live facts (2026-09-19): `/health` 200; `GET /assignments/TAT-2026-Q1` 200 (2 variants); `GET /assignments/TAT-2026-Q1/offline-bundle` 500; live OpenAPI saved in `docs/contracts/openapi-live-2026-09-19.json`.
