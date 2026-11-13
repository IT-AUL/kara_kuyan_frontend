# Spec — Compact Notification Feed & Editorial Article Reader

WHAT and WHY only. No implementation detail.

## Goal

Make `/notifications` effortless to scan and comfortable to read by separating the list view (brief, calm rows with 2-line teasers and zero repeated neon CTA buttons) from a dedicated full-screen article/event reader (`/notification-detail?id=...`) with clear editorial typography, structured sections/bullet lists, reading-time metadata, and a single focused action area.

## Non-goals

- Adding rich HTML/WebView rendering or remote images inside notifications (keeps bundle small, fast, offline-ready, and XSS-free).
- Changing Android `NotificationChannel` IDs, `WorkManager` sync cadence, or backend OpenAPI contracts.
- Showing student PII in notifications (strictly forbidden by ADR 0003 / ADR 0010).

## Assumptions

- Existing `Announcements Feed v1` items (`site/announcements.json` and future `GET /api/v1/announcements`) already provide `title`, `summary`, and optional `body`, `route`, `actionLabel`, `secondaryRoute`, `secondaryActionLabel`.
- Supporting lightweight plain-text / Markdown-lite formatting (`###` headings, `- ` / `• ` bullets, `1. ` steps, `> ` callouts, `\n\n` paragraphs) inside `body` up to 4,000 characters enriches both existing plain-text announcements and structured articles with 100% backward compatibility.

## Acceptance criteria

- [x] `/notifications` renders notifications as calm, high-density rows inside a unified surface (showing icon, unread dot, badge/category + date/reading time, 2-line title, 2-line summary, chevron) — with 3.5–5 items visible on a standard phone viewport instead of ~1.3 heavy bordered cards, and a compact single-row Android opt-in prompt when permission is not granted.
- [x] Tapping any row in `/notifications` marks it read and navigates to `/notification-detail?id=<id>`, which displays the full editorial article/event view (pinned top bar with back + quiet «Скрыть», category `StatusPill`, date & reading time, `24px` title, lead summary, structured paragraphs/headings/bullets/numbered steps/callouts, and a single clean CTA block at the bottom).
- [x] Pure domain article parser (`src/domain/notifications/article.ts`) and updated remote sanitizer (`remote.ts`, `4000`-char `body` cap) + curated `v0.4.2` guides (`feed.ts`, `site/announcements.json`) are covered by unit and component tests.
- [x] All 5 static quality gates pass (`pnpm run lint`, `pnpm run typecheck`, `pnpm test --runInBand`, `pnpm run check-deps`, `pnpm run doctor`) and visual runtime screenshots on Android 16 confirm clean hierarchy on both `/notifications` and `/notification-detail`.

## Open questions

- None.
