# Spec — Production API domain switch

## Goal

Point the app's default production backend URL to `https://api.kara-kuyan.it-aul.ru` (replacing the retired `https://tatar-ocr.duckdns.org` host) and verify every contract path — including the new `v4` analytics endpoints — against the live production server.

## Non-goals

- No schema or UI changes unless a live contract discrepancy is discovered.
- No changes to OCR/native modules or SQLite persistence.

## Acceptance criteria

- [x] AC1 `DEFAULT_API_URL` in `src/composition.ts` equals `'https://api.kara-kuyan.it-aul.ru'` (no trailing slash).
- [x] AC2 Live OpenAPI (`/openapi.json`) on `https://api.kara-kuyan.it-aul.ru` is compared against `docs/contracts/openapi-live-2026-11-03.json` (27/27 paths, exact JSON match).
- [x] AC3 `src/adapters/api/live.contract.test.ts` passes (`9/9`) with `LIVE_API_URL=https://api.kara-kuyan.it-aul.ru LIVE_WRITE=1`, including `v4` analytics calls (`studentAnalytics`, `assignmentAnalytics` `wrongAnswers`, `classAnalytics` `students`).
- [x] AC4 HTTPS/TLS chain (`ISRG Root X1/X2` → `Root YE` → `YE2`, `Verify return code: 0`) and CORS preflight (`Access-Control-Allow-Headers: content-type,x-teacher-uuid`) verified clean for Android `OkHttp` and web runtime.
- [x] AC5 All 5 static gates pass (`lint`, `typecheck`, `test --runInBand`, `check-deps`, `doctor`), change is reviewed and archived, and release `v0.2.1` is tagged.
