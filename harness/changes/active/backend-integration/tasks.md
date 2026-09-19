# Tasks: backend-integration

- [x] 0. Lead archives/parks `durable-outbox`, this change becomes active
- [ ] 1. A: `check-deps` + `doctor` after adding expo-secure-store
- [x] 2. A: HTTP client + `ApiError` + tests
- [x] 3. A: teacher identity port + SecureStore adapter
- [x] 4. A: response guards (health, handshake, metadata) from live spec
- [x] 5. A: `HttpGateway` on the client; error → retry/permanent mapping + tests
- [x] 6. A: payload conformance test vs live OpenAPI (ask user first)
- [x] 7. B: user OKs first write to live server; test-UUID handshake
- [x] 8. B: batch-sync smoke: insert, idempotent resend, list — evidence
- [ ] 9. B: device failure modes (offline, 500, timeout) — evidence
- [ ] 10. B: network capture audit (no image bytes) — evidence
- [ ] 11. C: backend fixes offline-bundle 500 (waiting)
- [ ] 12. C: BundleRepository + SQLite cache migration + evaluateSheet catalog
- [ ] 13. C: roster fetch + cache + matchStudent
- [ ] 14. Docs sync (offline-sync, contract-gaps, STATUS, roadmap slice 3) and independent review
