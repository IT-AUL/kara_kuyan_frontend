# Tasks — Universal Remote Announcements & Background Delivery

Atomic, ordered. Each task names its writer and its verification evidence.

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Update ADR 0010 & document backend/CDN announcements contract + gap 33 | `docs/adr/0010-android-notifications-and-news-feed.md`, `docs/contracts/announcements-feed-contract.md`, `docs/contracts/contract-gaps.md` | done | Updated ADR 0010, FastAPI+JSON contract in `announcements-feed-contract.md`, item 33 in `contract-gaps.md` |
| 2 | Install `expo-background-task` & `expo-task-manager` via `expo install` and configure `app.json` | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `app.json` | done | `pnpm run check-deps` (`Dependencies are up to date`), `pnpm run doctor` (`21/21 checks passed`) |
| 3 | Implement pure domain schema, validator, semver/expiry filter & unit tests | `src/domain/notifications/remote.ts`, `src/domain/notifications/remote.test.ts`, `src/domain/notifications/feed.ts`, `src/domain/notifications/feed.test.ts` | done | `pnpm test --runInBand` (`PASS src/domain/notifications/remote.test.ts`) |
| 4 | Implement `AnnouncementsPort`, dual-source adapter (Backend + CDN ETag + SQLite cache), and `WorkManager` background task | `src/ports/announcements.ts`, `src/ports/notifications.ts`, `src/adapters/notifications/remote-announcements.ts`, `src/adapters/notifications/remote-announcements.test.ts`, `src/adapters/notifications/background-sync.ts`, `src/adapters/notifications/expo-notifications.ts`, `src/composition.ts` | done | `PASS src/adapters/notifications/remote-announcements.test.ts`, `tsc --noEmit` (0 errors) |
| 5 | Wire `notificationCenter`, `NotificationObserver`, `NotificationsScreen` (pull-to-refresh, external `https://` links, sync status) | `src/features/notifications/notificationCenter.ts`, `src/features/notifications/NotificationObserver.tsx`, `src/features/notifications/NotificationsScreen.tsx` | done | `pnpm run lint` (0 errors/warnings), `pnpm run typecheck` (0 errors) |
| 6 | Create live `site/announcements.json` and `scripts/news/add-announcement.mjs` (`pnpm run news:add`) | `site/announcements.json`, `scripts/news/add-announcement.mjs`, `package.json` | done | `pnpm run news:add -- --dry-run ...` validated output |
| 7 | Run all 5 static gates, Android prebuild + Gradle build, and verify on Android 16 emulator + record review | `harness/changes/active/remote-announcements-feed/reviews/review.md` | done | `21/21` suites (`126` passed tests), `./gradlew :app:assembleDebug` `BUILD SUCCESSFUL`, Android 16 `dumpsys notification` (`tag=live-e2e-olympiad-2026`, `actions={[0] "Открыть"}`) + `dumpsys jobscheduler` (`JOB #u0a215/0 ... SystemJobService`, `Minimum latency: +29m59s`) |

## Completion definition

- [x] Every acceptance criterion in spec.md has evidence above.
- [x] No open question was silently guessed.
- [x] Review in `reviews/review.md` recorded.
