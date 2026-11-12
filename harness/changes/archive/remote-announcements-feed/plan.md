# Plan — Universal Remote Announcements & Background Delivery

HOW the spec is delivered.

## Approach

Extend ADR 0010 with a GMS-free dual-source `AnnouncementsPort` + Android Jetpack `WorkManager` (`expo-background-task` + `expo-task-manager`) periodic sync:
1. **Pure Domain (`src/domain/notifications/remote.ts`, `src/domain/notifications/feed.ts`)**: strict validator/sanitizer for untrusted remote JSON (`{ version, items }` or `[...]`), semver filtering (`minAppVersion` / `maxAppVersion`), expiration (`expiresAt`), safe navigation target validation (`/` route or `https://` external URL), and deterministic merge with curated items and live checking events.
2. **Port & Dual-Source Adapter (`src/ports/announcements.ts`, `src/adapters/notifications/remote-announcements.ts`)**: fetches optional backend `GET /api/v1/announcements` via `ApiClient` (treating 404/405/network failure as empty without error) + GitHub Pages CDN `https://it-aul.github.io/kara_kuyan_frontend/announcements.json` (or `EXPO_PUBLIC_ANNOUNCEMENTS_URL`) with `If-None-Match` ETag caching and SQLite `kvStore` persistence.
3. **Headless Background Sync (`src/adapters/notifications/background-sync.ts`, `app/_layout.tsx`)**: defines `KK_ANNOUNCEMENTS_BACKGROUND_SYNC` at module scope via `TaskManager.defineTask` and registers periodic `WorkManager` execution via `BackgroundTask.registerTaskAsync` so backgrounded apps still pull remote news and present Android notifications.
4. **UI & Authoring (`NotificationsScreen.tsx`, `site/announcements.json`, `scripts/news/add-announcement.mjs`)**: pull-to-refresh, external `https://` link support, sync timestamp, live `site/announcements.json`, and 1-command CLI generator.

Rejected alternatives:
- **FCM-only push**: fails on Huawei/Honor HMS devices without Google Play Services and requires unbuilt backend token storage.
- **Polling `api.github.com` for JSON**: rate-limited to 60 unauthenticated requests/hour per IP (problematic on shared school NAT Wi-Fi); GitHub Pages CDN + backend has no 60 req/hr cap and supports fast `ETag` `304 Not Modified`.

## File ownership

| File / area | Writer |
|---|---|
| `docs/adr/0010-android-notifications-and-news-feed.md`, `docs/contracts/announcements-feed-contract.md`, `docs/contracts/contract-gaps.md` | Antigravity |
| `src/domain/notifications/{remote.ts,remote.test.ts,feed.ts,feed.test.ts}` | Antigravity |
| `src/ports/{announcements.ts,notifications.ts}` | Antigravity |
| `src/adapters/notifications/{remote-announcements.ts,remote-announcements.test.ts,background-sync.ts,expo-notifications.ts}` | Antigravity |
| `src/composition.ts`, `app/_layout.tsx`, `app.json`, `package.json`, `pnpm-lock.yaml` | Antigravity |
| `src/features/notifications/{notificationCenter.ts,NotificationObserver.tsx,NotificationsScreen.tsx}` | Antigravity |
| `site/announcements.json`, `scripts/news/add-announcement.mjs` | Antigravity |

Rule: one writer per file. Everything else is read-only analysis.

## Risks

- **Shared school Wi-Fi NAT rate limits** → Serve static feed from `https://it-aul.github.io/kara_kuyan_frontend/announcements.json` (Fastly CDN, no 60/hr API cap) + `If-None-Match` ETag caching + backend `GET /api/v1/announcements`.
- **Untrusted remote payload / unsafe links** → Strict pure-domain validation with length caps, enum allowlists, and `https://`-only external URL check (`javascript:`, `http:`, `file:`, `intent:` dropped).
- **Backend `/api/v1/announcements` not yet deployed (404)** → Adapter treats 404/405/network errors silently and never touches outbox `sync_failed`.

## Deviations

None yet — filled at review time.
