# Tasks — Compact Notification Feed & Editorial Article Reader

Atomic, ordered. Each task names its writer and its verification evidence.

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Update ADR 0010 and Announcements Feed contract docs for compact feed → `/notification-detail` full-article UX | `docs/adr/0010-android-notifications-and-news-feed.md`, `docs/contracts/announcements-feed-contract.md` | done | ADR 0010 §5 & `announcements-feed-contract.md` updated |
| 2 | Add pure editorial parser (`article.ts` + `article.test.ts`), raise `remote.ts` `body` cap to `4000`, and enrich curated & CDN articles (`feed.ts`, `site/announcements.json`, `scripts/news/add-announcement.mjs`) | `src/domain/notifications/*`, `site/announcements.json`, `scripts/news/add-announcement.mjs` | done | `article.test.ts`, `feed.test.ts`, `remote.test.ts` all pass |
| 3 | Build `NotificationDetailScreen.tsx` (with pinned `Screen` `header`), route `app/notification-detail.tsx` (`app/_layout.tsx`), redesign `NotificationsScreen.tsx` into a calm compact feed, harden native notification module guards, and add `NotificationsScreen.test.tsx` | `src/design-system/components/Screen.tsx`, `src/adapters/notifications/*`, `src/features/notifications/*`, `app/notification-detail.tsx`, `app/_layout.tsx` | done | `NotificationsScreen.test.tsx` passes; runtime verified on Android 16 |
| 4 | Run all 5 static gates and capture visual verification of compact `/notifications` feed + opened `/notification-detail` full article on Android 16 | `harness/changes/active/notifications-editorial-reader/**` | done | `lint` (0), `typecheck` (0), `jest --runInBand` (24 suites / 133 passed), `check-deps` (up to date), `doctor` (21/21); Android 16 screenshots verified |

## Completion definition

- [x] Every acceptance criterion in spec.md has evidence above.
- [x] No open question was silently guessed.
- [x] Review in `reviews/review.md` recorded.
