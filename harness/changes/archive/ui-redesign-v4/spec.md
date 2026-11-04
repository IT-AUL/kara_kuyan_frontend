# Spec — UI redesign v4

## Goal

The teacher-facing UI matches the approved v4 concept — `docs/design/v4/prototype-v4.html` (22 screens) and `docs/design/v4/analytics-v1.html` — so that:

- every screen has one idea and one primary action;
- progress reads as words + a thin strip ("10 из 16"), not rings or dot grids;
- data is shown as number → plain-language conclusion → action;
- analytics answers concrete teacher questions: week to-dos, test results with the zavuch formulas, per-task error breakdown, class heatmap, Tatar letters map, student profile, zavuch report.

Research and rationale: `docs/design/v4/06-mobbin-patterns.md`, `docs/design/v4/07-analytics-concept.md`.

## Non-goals

- No change to scan, OCR, native modules, outbox/sync logic or persistence (`modules/**`, `src/adapters/ocr-native/**`, `src/adapters/sqlite/**`, `src/adapters/sync/**`, `src/domain/sync/**`, `src/features/checking/scanSession.ts`, `src/features/checking/sync/**`). The API adapter only gets **additive** parsing of fields the live contract already returns (`wrong_submissions`, `GET /analytics/students/{id}`), done by the lead in RD-00.
- No new npm dependencies (charts are built from `View`s; `react-native-svg` is not added).
- No invented backend semantics: data the API does not return is hidden or shown as "нет данных", never faked (see open questions).
- The real per-sheet checking flow (scan → processing → student-identified → assessment-result → task-review) stays; screens are restyled, not re-sequenced.

## Assumptions

- Design reference HTML is the visual source of truth; React Native implementation may differ in pixel details but not in structure, hierarchy, copy, or colors.
- Current analytics resources in `src/data/hub.ts` (`classAnalyticsResource`, `assignmentAnalyticsResource`, `progressResource`, `submissionsResource`) are enough for the hub, test results, task breakdown and student list. Unverified for the heatmap (needs the list of submitted students per assignment).

## Acceptance criteria

- [x] AC1 Design system: tokens and the primitives listed in `plan.md` exist, are exported from `@/design-system`, and have unit tests for any pure helpers.
- [x] AC2 Each redesigned screen matches its reference screenshot in `docs/design/v4/shots/` in structure, copy and color roles (lead visual review on Android emulator/device; screenshots recorded per task).
- [x] AC3 Analytics: hub, test results, task breakdown, class map, letters, student profile, zavuch report are reachable and render real API data, with empty/offline/error states.
- [x] AC4 Analytics math (quality, success rate, SOU, average grade, accuracy zones, wrong-answer grouping) lives in `src/domain/analytics/` with unit tests using the formulas in `07-analytics-concept.md`.
- [x] AC5 Zero-photo and architecture rules hold: no UI file imports `src/adapters/**` directly; no image data leaves native memory; no feature-to-feature imports.
- [x] AC6 Gates green on `main` after the last merge: `pnpm run lint`, `pnpm run typecheck`, `pnpm test --runInBand`, `pnpm run check-deps`, `pnpm run doctor`.
- [x] AC7 Independent review recorded in `reviews/review.md`.

## Open questions

- Per-assignment grade distribution 5/4/3/2 is not an API field, but `GET /submissions?class_id&assignment_id` returns each student's `grade` and per-task `questions_results`; the client derives the distribution and the heatmap from them (this is aggregation of returned data, not invented semantics). Absent students = roster minus submissions.
- Error-type classification (сингармонизм / буква / аллофон / пропуск) is not in the API. UI shows the tag only when the backend supplies it; the client must not classify.
- Removing the "Тесты" tab in favour of "Аналитика" (v4 nav) — approved by the user through the v4 concept; tests stay reachable from Home.
