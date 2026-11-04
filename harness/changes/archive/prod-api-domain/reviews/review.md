# Review — Production API domain switch (`api.kara-kuyan.it-aul.ru`)

Independent review record by Antigravity.

## Verdict

**ACCEPT** — `https://api.kara-kuyan.it-aul.ru` serves the exact 27-endpoint OpenAPI 3.1 contract over HTTP/2 with a complete Let's Encrypt → ISRG Root X1/X2 certificate chain, passes all 9/9 live read+write contract tests (including the new `v4` analytics fields and endpoints), and passes all 5 static quality gates.

## Evidence check

- [x] Every spec acceptance criterion has matching recorded evidence.
- [x] Claimed test/build outputs were actually produced (not narrated).

### Recorded verification outputs (`2026-11-04`)

1. **Health & HTTP/2 + HSTS**:
   - `GET https://api.kara-kuyan.it-aul.ru/health` → `HTTP/2 200`, `strict-transport-security: max-age=31536000`, `{"status":"ok","service":"Кара куян (Tatar OCR) Task Generator"}`.
2. **Android TLS Trust Chain (`openssl s_client -showcerts`)**:
   - `0: CN=api.kara-kuyan.it-aul.ru` → `1: Let's Encrypt YE2` → `2: ISRG Root YE` → `3: ISRG Root X2` (signed by `ISRG Root X1`) → `Verify return code: 0 (ok)`.
3. **OpenAPI diff vs `docs/contracts/openapi-live-2026-11-03.json`**:
   - `Paths count old vs new: 27 vs 27`, `Added paths: []`, `Removed paths: []`, `Exact JSON match: True`.
4. **Live Contract Suite (`LIVE_API_URL=https://api.kara-kuyan.it-aul.ru LIVE_WRITE=1 pnpm test --runInBand src/adapters/api/live.contract.test.ts`)**:
   - `9 passed, 9 total (11.817 s)` — handshake, lists, manifest (39 chars), bulk student import + teacher isolation, 422 validation, custom + generated tasks, test assembly, class assignment, single & batch PDF blanks (`%PDF`), `batch-sync` insert + idempotent update, `classAnalytics` (`students_performance_table`), `assignmentAnalytics` (`wrong_submissions` with `written_answer: 'ХАТА'`), `studentAnalytics` (`history`), and `xlsx`/`csv` gradebook downloads.
5. **Static gates**:
   - `pnpm run lint` → exit 0
   - `pnpm run typecheck` → exit 0
   - `pnpm test --runInBand` → `18 passed, 107 passed`
   - `pnpm run check-deps` → `Dependencies are up to date`
   - `pnpm run doctor` → `21/21 checks passed. No issues detected!`

## Deviations from plan

| Deviation | Justified? | Note |
|---|---|---|
| Verified Android HTTPS/TLS compatibility via full `openssl s_client -showcerts` chain inspection + live `ApiClient` suite instead of `pc` emulator | Yes | Home PC (`192.168.0.110`) was asleep (`Operation timed out`); full chain + all 9 live API operations verified directly against prod |

## Residual risks

- Devices still running `0.2.0` or earlier point to retired `tatar-ocr.duckdns.org` until updated to `0.2.1` (in-app updater fetches from GitHub Releases directly, so `0.1.6` / `0.2.0` installs can still self-update to `0.2.1`!).
