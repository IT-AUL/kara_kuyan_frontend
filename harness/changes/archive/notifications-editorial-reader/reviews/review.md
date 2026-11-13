# Review — Compact Notification Feed & Editorial Article Reader

Independent review across all 6 `kara-delivery` roles (Product, Mobile Architect, Security/ADR-0003, UX, API Contract, QA/Performance).

## Verdict

accept

## Evidence check

- [x] Every spec acceptance criterion has matching recorded evidence.
- [x] Claimed test/build outputs were actually produced (not narrated).

## Role lens audit

1. **Product guardian:** Keeps notifications practical, concise, and helpful for Tatar language teachers (`0.4.2` camera guide, Zero-Touch workflow, offline mode, class insights, olympiad announcements). No noisy marketing chrome or student ranking.
2. **Mobile architect:** Pure Markdown-lite parser and date/read-time utilities live in `src/domain/notifications/article.ts`; UI screens (`NotificationsScreen.tsx`, `NotificationDetailScreen.tsx`) route via Expo Router (`/notification-detail?id=...`) and `notificationCenter` without direct native/SQL/HTTP calls; `background-sync.ts` and `expo-notifications.ts` gracefully guard optional native modules via `requireOptionalNativeModule`.
3. **Security reviewer (`ADR 0003`):** Zero HTML/WebView rendering (eliminating XSS vectors on remote announcements), strict `4000`-char text cap and scheme allowlisting (`/...` or `https://...`) in `remote.ts`, and zero student PII.
4. **UX designer:** Strictly follows `docs/design/design-direction.md` ("fewer cards, fewer borders, more negative space; one dominant CTA and one main decision per screen"): 5 items fit cleanly on `/notifications` inside a unified surface with unread dot + semantic badge + read-state transition (`07_feed_read_state.png`), while `/notification-detail` renders airy `16px/25px` typography, `24px` bold headline, numbered steps (`1, 2, 3`), callout box, pinned `← / Скрыть` bar, and a single sticky bottom CTA (`05_pinned_header_article_top.png`, `06_pinned_header_article_bottom.png`, `08_steps_and_callout_article.png`). Tatar Cyrillic glyphs (`Ә, Ө, Ү, Җ, Ң, Һ`) verified on Android 16.
5. **API contract guardian:** 100% backward-compatible with `Announcements Feed v1` (`site/announcements.json` and `GET /api/v1/announcements`); documented in `docs/contracts/announcements-feed-contract.md`.
6. **QA/performance:** All 5 static gates pass (`24/24` active test suites, `133` passed tests, `21/21` `expo-doctor`) and end-to-end navigation verified on Android 16 (`Medium_Phone_API_36.1`).

## Deviations from plan

| Deviation | Justified? | Note |
|---|---|---|
| Added optional `header?: ReactNode` to `Screen.tsx` | Yes | Keeps the `←` Back and `Скрыть` bar pinned when scrolling down to the bottom of multi-section articles. |
| Guarded `expo-background-task` and `expo-notifications` with `requireOptionalNativeModule` | Yes | Discovered during Android 16 runtime verification that top-level `import *` threw `Cannot find native module` inside older dev-client shells / Web; guarding with `requireOptionalNativeModule` preserves full native behavior on `v0.4.1+` APKs while eliminating crashes elsewhere. |

## Issues found

- Top-level `import *` in `background-sync.ts` and `expo-notifications.ts` crashed older dev-client shells lacking `ExpoTaskManager` / `ExpoPushTokenManager` → fixed and verified on Android 16.
- Scrolling down an article hid the `←` Back button → fixed via pinned `header` prop on `Screen.tsx` and verified in `06_pinned_header_article_bottom.png`.

## Residual risks

- None.
