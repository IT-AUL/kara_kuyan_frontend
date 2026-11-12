# Spec — Universal Remote Announcements & Background Delivery

WHAT and WHY only. No implementation detail.

## Goal

Enable the Kara Kuyan team to broadcast news, Tatar language olympiads/events, checking tips, and urgent updates to teachers' Android phones remotely without rebuilding the APK and without Google Play Services / Firebase lock-in — working immediately via static JSON on GitHub Pages CDN and automatically picking up `GET /api/v1/announcements` on `https://api.kara-kuyan.it-aul.ru` once deployed on the backend, both in foreground (with pull-to-refresh) and periodically in the background via Android `WorkManager`.

## Non-goals

- Firebase Cloud Messaging (FCM) / Google Play Services push tokens (fails on HMS-only Huawei/Honor school phones and requires backend token storage not in the live contract).
- Sending student-specific PII or individual student grades in remote announcements or system notifications (forbidden by ADR 0003 / ADR 0010).

## Assumptions

- `https://it-aul.github.io/kara_kuyan_frontend/` is automatically deployed from `site/**` on pushes to `main` via `.github/workflows/deploy-site.yml` (verified via GitHub Pages API).
- `https://api.kara-kuyan.it-aul.ru` does **not** yet serve `GET /api/v1/announcements` (verified against live `/openapi.json`: 27 paths); HTTP 404/405 from that path must be treated silently as "backend feed not enabled yet", never as an error.

## Acceptance criteria

- [x] Remote announcements schema supports `id`, `kind` (`event` | `insight` | `news` | `tip`), `channelId`, `tone`, `icon`, `badge`, `title`, `summary`, `body`, `publishedAt`, optional `expiresAt`, `pinned`, `systemNotify`, `minAppVersion`, `maxAppVersion`, internal `route` (`/…`) or external `https://` URL, and strictly rejects malformed payloads or unsafe URL schemes (`http:`, `javascript:`, `file:`, `intent:`).
- [x] Dual-source `AnnouncementsPort` adapter queries backend `GET /api/v1/announcements` (silently ignoring 404/405/offline) and CDN `https://it-aul.github.io/kara_kuyan_frontend/announcements.json` (with `ETag` / `If-None-Match` conditional caching and `EXPO_PUBLIC_ANNOUNCEMENTS_URL` override), merges/deduplicates by `id`, and persists cached items in SQLite `kvStore` for full offline access.
- [x] Periodic Android `WorkManager` background sync (`expo-background-task` + `expo-task-manager`) wakes headless, refreshes remote announcements + GitHub Releases, updates SQLite cache, and fires at most 1 deduplicated Android system notification when opted in.
- [x] `NotificationsScreen` (`/notifications`) supports pull-to-refresh (`onRefresh`), displays sync freshness, safely opens external `https://` links (`Linking.openURL`) as well as internal routes, and includes a manual «Проверить новости сейчас» trigger.
- [x] Authoring workflow includes `site/announcements.json`, CLI helper `pnpm run news:add`, and backend contract proposal `docs/contracts/announcements-feed-contract.md` + `docs/contracts/contract-gaps.md` item 33.
- [x] All 5 static gates (`lint`, `typecheck`, `test --runInBand`, `check-deps`, `doctor`), clean Android Gradle build, and on-device Android 16 verification pass with recorded evidence.

## Open questions

- Optional backend adoption: when Danis enables `GET /api/v1/announcements` on `https://api.kara-kuyan.it-aul.ru` (contract documented in `docs/contracts/announcements-feed-contract.md`, gap 33), existing clients will consume it automatically alongside `announcements.json`.
