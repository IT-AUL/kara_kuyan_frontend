# Tasks: backend-integration

- [x] 0. Lead archives/parks `durable-outbox`, this change becomes active
- [x] 1. A: `check-deps` + `doctor` after adding expo-secure-store
- [x] 2. A: HTTP client + `ApiError` + tests
- [x] 3. A: teacher identity port + SecureStore adapter
- [x] 4. A: response guards (health, handshake, metadata) from live spec
- [x] 5. A: `HttpGateway` on the client; error → retry/permanent mapping + tests
- [x] 6. A: payload conformance test vs live OpenAPI (ask user first)
- [x] 7. B: user OKs first write to live server; test-UUID handshake
- [x] 8. B: batch-sync smoke: insert, idempotent resend, list — evidence
- [ ] 9. B: device failure modes (offline, 500, timeout) — evidence
- [ ] 10. B: network capture audit (no image bytes) — evidence
- [x] 11. (worked around: constructor-made assignments serve bundles) C: backend fixes offline-bundle 500 (waiting)
- [x] 12. C: BundleRepository + SQLite cache migration + evaluateSheet catalog
- [x] 13. C: roster fetch + cache + matchStudent
- [ ] 14. Docs sync (offline-sync, contract-gaps, STATUS, roadmap slice 3) and independent review
- [ ] 15. Import a sheet image from the phone (ADR 0007): native picker + reader, «Загрузить лист из файла» — device evidence pending
- [x] 16. Constructor UX (builder, bank, generator, own task) + live write path verified
- [x] 17. Screen roles: Home / Проверка / Тесты + test page; hide tests locally
- [x] 18. Class assignments (assign, list with progress, batch blanks) wired; live suite 6/6
- [x] 19. Forced check of a refused sheet (domain + UI); domain tests
- [ ] 20. «Из фото» (ADR 0009, `scan-task`): implemented, built into the debug APK; device evidence pending
- [ ] 21. Device evidence: forced-check result, batch PDF, auto-assign; privacy audits (tasks 9, 10)

