# Plan — Compact Notification Feed & Editorial Article Reader

HOW the spec is delivered.

## Approach

- **Two-level progressive disclosure (`OtherWorks` / Linear Inbox pattern):**
  - Level 1 (`/notifications`): Group feed items inside a calm `Card` list container (`borderRadius: radius.xxl`, `hairline` row dividers, `touchTarget` rows, no neon CTA chips per row, no inline `expandedWrap` boxes, compact 1-row Android opt-in strip).
  - Level 2 (`/notification-detail?id=...`): Dedicated Expo Router screen (`NotificationDetailScreen`) with pinned top navigation (`Screen` `header` prop), generous editorial spacing, `24px` bold headline, highlighted lead (`summary`), structured Markdown-lite blocks parsed purely in `src/domain/notifications/article.ts` (headings, paragraphs, bullet lists, numbered steps, callouts, reading-time estimate), one primary/secondary CTA footer, and a secondary header action to hide/dismiss the item.
- **Rejected alternatives:**
  - *Inline accordion expansion inside `/notifications`*: tried in `v0.4.0–0.4.2`, caused severe visual overload, cramped `14px` text walls, and pushed other notifications off-screen.
  - *Bottom sheet modal for articles*: cramped for multi-paragraph methodology tips or release notes and lacks native Android predictive-back screen navigation.

## File ownership

| File / area | Writer |
|---|---|
| `docs/adr/0010-android-notifications-and-news-feed.md`, `docs/contracts/announcements-feed-contract.md` | Antigravity |
| `src/domain/notifications/{article.ts,article.test.ts,feed.ts,remote.ts}` | Antigravity |
| `src/design-system/components/Screen.tsx` | Antigravity |
| `src/adapters/notifications/{background-sync.ts,expo-notifications.ts}` | Antigravity |
| `src/features/notifications/{NotificationsScreen.tsx,NotificationDetailScreen.tsx,NotificationsScreen.test.tsx,notificationCenter.ts,notificationVisuals.ts}` | Antigravity |
| `app/_layout.tsx`, `app/notification-detail.tsx` | Antigravity |
| `site/announcements.json`, `scripts/news/add-announcement.mjs` | Antigravity |

Rule: one writer per file. Everything else is read-only analysis.

## Risks

- **Duplicate summary vs body when `body` wasn't provided (`body === summary`):** Mitigated in `parseArticleContent(summary, body)` — when `body.trim() === summary.trim()`, render the text once cleanly as the article body rather than repeating the same sentence twice.
- **Stale/missing `id` deep link (`/notification-detail?id=unknown`):** Mitigated with a clean `EmptyState` fallback and a 1-tap button back to `/notifications`.

## Deviations

- Added optional `header?: ReactNode` prop to `src/design-system/components/Screen.tsx` so `NotificationDetailScreen` keeps `←` Back and `Скрыть` pinned above the scroll area on long articles.
- Guarded `expo-background-task` / `expo-task-manager` and `expo-notifications` with `requireOptionalNativeModule` in `src/adapters/notifications/{background-sync.ts,expo-notifications.ts}` after Android runtime testing caught top-level `requireNativeModule` crashes when loading bundles inside older dev-client shells or Web.
