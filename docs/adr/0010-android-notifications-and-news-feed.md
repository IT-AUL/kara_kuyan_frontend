# ADR 0010: Android Notifications, Remote Announcements Feed & Background Sync

**Status:** Accepted (2026-11-12; updated 2026-11-13)

## Context

Teachers need timely awareness of meaningful workflow events (a class worksheet pack finished and ready for gradebook export, offline outbox sync completion or failure, class-wide Tatar grammar/orthography error spikes, app updates from GitHub Releases, practical tips for faster checking, and remote announcements such as Tatar language olympiads, methodology updates, or service notices) without noisy marketing pings, cold-start permission popups, Google Play Services (GMS/FCM) lock-in that fails on Huawei/Honor school phones, or lockscreen student PII exposure.

## Decision

1. **Local & System Notification Port (`expo-notifications`, no FCM/GMS dependency):**
   - Selected from current Expo SDK 57 official docs; configured in `app.json` with monochrome icon (`./assets/images/android-icon-monochrome.png`) and brand accent `#25E38A`.
   - Wrapped behind `NotificationsPort` (`src/ports/notifications.ts`) and `expoNotificationsAdapter` (`src/adapters/notifications/expo-notifications.ts`), wired only in `src/composition.ts` (ADR 0002).
2. **Universal Dual-Source Remote Announcements (`AnnouncementsPort` + ETag + SQLite Cache):**
   - Wrapped behind `AnnouncementsPort` (`src/ports/announcements.ts`) and `httpAnnouncementsAdapter` (`src/adapters/notifications/remote-announcements.ts`).
   - Queries two complementary sources and merges/deduplicates by `id`:
     1. **Backend API (`GET /api/v1/announcements` on `https://api.kara-kuyan.it-aul.ru`)** via `ApiClient` (`X-Teacher-UUID` header for optional teacher/school scoping). Since this endpoint is an optional proposed contract (`docs/contracts/announcements-feed-contract.md`, `contract-gaps.md` #33), HTTP `404`/`405` or network unavailability is ignored silently without triggering sync errors; once deployed on the backend, installed clients automatically consume it.
     2. **GitHub Pages CDN (`https://it-aul.github.io/kara_kuyan_frontend/announcements.json`, overridable via `EXPO_PUBLIC_ANNOUNCEMENTS_URL`)** published automatically from `site/announcements.json` via `.github/workflows/deploy-site.yml`. Uses conditional `If-None-Match` (`ETag`) requests (`304 Not Modified` when unchanged) and persists validated items in SQLite `kvStore` (`notifications:remote_items:v1`) for 100% offline reading.
   - Untrusted remote JSON is sanitized in pure domain code (`src/domain/notifications/remote.ts`): strict length caps, enum allowlists, app version targeting (`minAppVersion` / `maxAppVersion`), expiration (`expiresAt`), and safe navigation targets (internal `/…` routes or `https://` external URLs only).
3. **Android Jetpack `WorkManager` Periodic Background Sync (`expo-background-task` + `expo-task-manager`):**
   - Replaces deprecated `expo-background-fetch` per Expo SDK 53–57 official guidance.
   - Defines headless task `KK_ANNOUNCEMENTS_BACKGROUND_SYNC` at module scope (`src/adapters/notifications/background-sync.ts`) and registers periodic `WorkManager` execution so backgrounded apps still pull remote news/releases, update SQLite cache, and fire at most 1 deduplicated Android system notification when opted in — working across Samsung, Xiaomi, Pixel, and GMS-free Huawei/Honor devices.
4. **Android 13–16 Channel & Permission Discipline:**
   - Register 4 granular `NotificationChannel`s (`check_sync`, `class_insights`, `updates_news`, `teacher_tips`) and interactive `NotificationCategory` actions (`pack_complete`, `sync_failed`, `topic_insight`, `release_update`, `remote_announcement`) BEFORE requesting `POST_NOTIFICATIONS`.
   - Never prompt `POST_NOTIFICATIONS` on cold launch; request contextually from `/notifications`, with graceful fallback to the in-app feed if denied.
   - Respect Android 15 Notification Cooldown by deduplicating event keys in `kvStore` and firing at most one new system banner per sync cycle.
5. **Privacy & Zero-Photo / Zero-PII on Lockscreen (ADR 0003):**
   - System notifications and remote feeds never include individual student names, individual grades, or image data.

## Consequences

- **Positive:** Team can broadcast announcements in seconds today via `pnpm run news:add` / editing `site/announcements.json` on GitHub, AND seamlessly transition to or combine with `GET /api/v1/announcements` on `https://api.kara-kuyan.it-aul.ru` with zero APK rebuild; works on 100% of Android devices (including HMS-only phones) both in foreground (with pull-to-refresh) and periodically in background via `WorkManager`.
- **Negative:** Background `WorkManager` cadence is OS-scheduled (~30–60+ minutes depending on Android Doze/App Standby bucket) rather than sub-second push, which is appropriate and battery-friendly for teacher announcements, events, and methodology tips.
