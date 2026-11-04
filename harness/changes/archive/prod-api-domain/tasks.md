# Tasks — Production API domain switch

| # | Task | Writer | Files owned | Status | Verification evidence |
|---|---|---|---|---|---|
| PD-01 | Switch `DEFAULT_API_URL` to `https://api.kara-kuyan.it-aul.ru` and extend `live.contract.test.ts` for v4 analytics | lead | `src/composition.ts`, `src/adapters/api/live.contract.test.ts`, `docs/STATUS.md` | done | `LIVE_API_URL=https://api.kara-kuyan.it-aul.ru LIVE_WRITE=1 pnpm test --runInBand src/adapters/api/live.contract.test.ts` → `9/9 PASS` (`11.8s`) |
| PD-02 | Verify TLS chain, HSTS, CORS, and OpenAPI parity on `https://api.kara-kuyan.it-aul.ru` | lead | `reviews/review.md` | done | `openssl s_client -showcerts` (`Verify return code: 0`, full `ISRG Root X1` cross-sign chain), `/openapi.json` exact match (27 paths), `OPTIONS` CORS `200` |
| PD-03 | Static gates, review, archive change, and cut `v0.2.1` | lead | `harness/changes/**`, `app.json`, `package.json`, `docs/STATUS.md` | done | `lint`, `typecheck`, `jest` (`18 suites / 107 passed`), `check-deps`, `doctor` (`21/21`) green; tagged `v0.2.1` |
