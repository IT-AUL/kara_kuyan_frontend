# ADR 0010: Android Notifications & In-App News/Events Hub

**Status:** Accepted (2026-11-12)

## Context

Teachers need timely awareness of meaningful workflow events (a class worksheet pack finished and ready for gradebook export, offline outbox sync completion or failure, class-wide Tatar grammar/orthography error spikes, app updates from GitHub Releases, and practical tips for faster checking) without noisy marketing pings, cold-start permission popups, or lockscreen student PII exposure. The live backend (`https://api.kara-kuyan.it-aul.ru`) has no FCM/push registration endpoint (`docs/contracts/openapi-live-2026-09-19.json`), so inventing server push endpoints would violate the contract rule.

## Decision

1. **Library (`expo-notifications` via Expo config plugin, local/event-driven + GitHub Releases, no FCM dependency):**
   - Selected from current Expo SDK 57 official docs; configured in `app.json` with monochrome icon (`./assets/images/android-icon-monochrome.png`) and brand accent `#25E38A`.
   - Wrapped behind `NotificationPort` (`src/ports/notifications.ts`) and `expoNotificationsAdapter` (`src/adapters/notifications/expo-notifications.ts`), wired only in `src/composition.ts` (ADR 0002).
2. **Android 13–16 Channel & Permission Discipline:**
   - Register 4 granular `NotificationChannel`s (`check_sync`, `class_insights`, `updates_news`, `teacher_tips`) and interactive `NotificationCategory` actions BEFORE requesting `POST_NOTIFICATIONS` (required on Android 13/14+ for the runtime dialog to appear).
   - Never prompt `POST_NOTIFICATIONS` on cold launch; request contextually from the in-app «Уведомления и новости» screen (`/notifications`) or opt-in card, with graceful fallback to the in-app feed if denied.
   - Respect Android 15 Notification Cooldown by deduplicating event keys in `kvStore` and using `AndroidImportance.LOW` for news/tips and `DEFAULT` for workflow completions/insights.
3. **Privacy & Zero-Photo / Zero-PII on Lockscreen (ADR 0003):**
   - System notifications contain only aggregate class/test/topic metadata (never student full names, individual grades, or image data).
4. **Two-Layer Experience:**
   - Every important event, release note (including live GitHub Releases checks), and practical checking guide appears in the persistent in-app «Уведомления и новости» feed (`/notifications`, accessible from the bell badge on `HomeScreen` and `MoreScreen`) and optionally fires a deep-linked Android system notification with action buttons (`Открыть`, `В журнал`, `Аналитика`, `Повторить`).

## Consequences

- Positive: works 100% offline and with the existing production backend + GitHub Releases; respects Android 13–16 channel/permission rules and school privacy; zero Firebase/GMS server coupling.
- Negative: remote broadcast announcements require either a new GitHub Release or a future backend announcements endpoint (recorded as optional future enhancement, not invented).
