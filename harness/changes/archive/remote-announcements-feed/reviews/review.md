# Review — Universal Remote Announcements & Background Delivery

Independent review across all 6 `kara-delivery` lenses.

## Verdict

accept

## Evidence check

- [x] Every spec acceptance criterion has matching recorded evidence.
- [x] Claimed test/build outputs were actually produced (not narrated):
  - `CI=1 pnpm run lint` → 0 errors / 0 warnings
  - `CI=1 pnpm run typecheck` → 0 errors
  - `CI=1 pnpm test --runInBand` → 21 passed suites, 126 passed tests (9 live opt-in skipped)
  - `CI=1 pnpm run check-deps` → `Dependencies are up to date`
  - `CI=1 pnpm run doctor` → `21/21 checks passed. No issues detected!`
  - `CI=1 pnpm exec expo prebuild --platform android --clean --no-install && cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a` → `BUILD SUCCESSFUL in 1m 24s`
  - Android 16 (`API 36.1`, `arm64-v8a`) live verification:
    - `dumpsys notification --noredact` confirmed `NotificationRecord(pkg=com.karakuyan.app ... tag=live-e2e-olympiad-2026 ... channel=updates_news ... actions={[0] "Открыть"})`.
    - `dumpsys jobscheduler` confirmed `JOB #u0a215/0: com.karakuyan.app/androidx.work.impl.background.systemjob.SystemJobService` with `Capabilities: INTERNET&TRUSTED&VALIDATED` and `Minimum latency: +29m59s965ms`.
    - Visual screenshots verified on `/notifications` (`Олимпиада по татарскому языку РТ` card + `Собрать разминку ->` CTA + home bell badge `6`).

## Lenses audit

- **Product guardian:** Teacher-focused announcements (olympiads, warm-ups, checking updates); zero student rankings; deduplicated per `id` and throttled to 1 system banner per sync cycle.
- **Mobile architect:** Clean `domain -> ports -> adapters -> composition -> features` layering; headless `TaskManager.defineTask` bound at module scope so `WorkManager` wakeups run without mounted React views.
- **Security reviewer:** Strict domain sanitizer (`src/domain/notifications/remote.ts`) enforces length bounds, prevents `event:*` / `insight:*` spoofing, and rejects `http://`, `javascript:`, `file:`, `intent:`, and `//` URLs. Zero student PII.
- **API contract guardian:** `GET /api/v1/announcements` recorded as optional proposal in `docs/contracts/announcements-feed-contract.md` and `contract-gaps.md` #33; `404`/`405` handled silently while `site/announcements.json` works immediately via GitHub Pages CDN.

## Deviations from plan

| Deviation | Justified? | Note |
|---|---|---|
| None | — | Delivered cleanly as planned. |

## Issues found

- None.

## Residual risks

- Android OEM aggressive battery killers (e.g. MIUI/HyperOS custom auto-start restrictions) can delay `WorkManager` background intervals beyond 30 minutes until the app is next opened; foreground resume + pull-to-refresh + SQLite offline cache ensure zero missed announcements.
