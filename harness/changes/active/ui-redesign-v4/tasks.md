# Tasks — UI redesign v4

Atomic, ordered. Each task names its writer and its verification evidence. Detailed agent specs: `.farm/tasks/RD-xx.md` (local farm folder, not committed). Branches: `farm/RD-xx`.

| # | Task | Writer | Files owned | Status | Verification evidence |
|---|---|---|---|---|---|
| RD-00 | Data layer: parse `wrong_submissions`, add student analytics + resource | lead | `src/adapters/api/backend.ts`, `src/data/hub.ts`, `src/adapters/api/analytics.test.ts` | done | `78cea04` — `analytics.test.ts` (4 tests pass) + `tsc --noEmit` |
| RD-01 | Design system v4 tokens + primitives | argon | `src/design-system/**`, `app/ds-gallery.tsx` | done | `84753f6`, `059e339`, `3698c64`, `e6e314e` — `zones.test.ts` + `evidence/board_6.jpg` (row 3) |
| RD-02 | Tab bar (Главная · Проверка · Аналитика · Ещё) + Home | argon | `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/insights.tsx`, `src/features/home/HomeScreen.tsx`, `src/features/home/components/**` | done | `32bd970`, `470b662`, `6da63f3` — gates + `evidence/board_1.jpg` (row 3) |
| RD-03 | Onboarding + privacy priming | argon | `src/features/onboarding/**`, `app/onboarding.tsx` | done | `151ae88`, `4e64053`, `af91e77` — gates + `evidence/board_1.jpg` (rows 1–2) |
| RD-04 | Scan HUD + identity confirm + processing | argon | `src/features/checking/ScanScreen.tsx`, `StudentIdentifiedScreen.tsx`, `ProcessingScreen.tsx`, `ScanHud.tsx`, `StudentIdentityCard.tsx`, `SheetWarnings.tsx` | done | `988b98f`, `93d3585` — lint/typecheck/jest green |
| RD-05 | Queue (CheckScreen) + «Класс проверен» + per-sheet result | argon | `src/features/checking/CheckScreen.tsx`, `CheckDoneScreen.tsx`, `app/check-done.tsx`, `AssessmentResultScreen.tsx`, `ResultSummaryCard.tsx`, `TaskResultRow.tsx` | done | `b798467`, `8b679a4` — gates + `evidence/board_2.jpg` (rows 1–2) |
| RD-06 | Review: swipe card + ✕/✓ + undo | argon | `src/features/checking/TaskReviewScreen.tsx`, `components/ReviewCard.tsx`, `components/ReviewCard.test.tsx` | done | `81de9ef`, `068880f` — `ReviewCard.test.tsx` pass + gates |
| RD-07 | Analytics domain + hub + test results | argon | `src/domain/analytics/**`, `src/features/analytics/AnalyticsScreen.tsx`, `TestResultsScreen.tsx`, `data.ts`, `app/analytics.tsx`, `app/analytics-test.tsx` | done | `a417f74`, `8b3b055`, `4cbd5f1` — `stats.test.ts` pass + `evidence/board_2.jpg` (row 3), `evidence/board_3.jpg` (row 1) |
| RD-08 | More/sync statuses + journal export | argon | `src/features/home/MoreScreen.tsx`, `SyncSummary.tsx`, `SyncWorkRow.tsx`, `app/(tabs)/more.tsx`, `src/features/analytics/ExportGradebookScreen.tsx` | done | `e1b693a`, `d841d59`, `c444f79` — gates + `evidence/board_5.jpg` (rows 1–2) |
| RD-09 | Task breakdown + class map | argon | `src/features/analytics/TaskAnalysisScreen.tsx`, `ClassMapScreen.tsx`, `AnswerGroupCard.tsx`, `HeatmapGrid.tsx`, `app/analytics-task.tsx`, `app/analytics-map.tsx` | done | `80da273`, `87da203`, `4cbd5f1`, `6da63f3` — `evidence/board_3.jpg` (rows 2–3) |
| RD-10 | Letters map + student profile | argon | `src/features/analytics/LettersScreen.tsx`, `StudentProfileScreen.tsx`, `LetterKey.tsx`, `HistoryBars.tsx`, `app/analytics-letters.tsx`, `app/analytics-student.tsx` | done | `35d1ce2`, `2c711b8` — `evidence/board_4.jpg` (rows 1–2) |
| RD-11 | Zavuch report | argon | `src/features/analytics/ReportScreen.tsx`, `report.ts`, `report.test.ts`, `app/analytics-report.tsx` | done | `9d695b4`, `848d496`, `4cbd5f1` — `report.test.ts` pass + `evidence/board_4.jpg` (row 3) |
| RD-12 | Assignments restyle (test new, print) | argon | `src/features/assignments/**`, `app/test-*.tsx`, `app/task-*.tsx` | done | `7473549`, `f6b0d8c`, `11e2823`, `4cbd5f1` — `evidence/board_5.jpg` (row 3), `evidence/board_6.jpg` (rows 1–2) |
| RD-99 | Route glue, 4-device emulator matrix pass, review | lead | `app/_layout.tsx`, responsive polish, `docs/STATUS.md`, `harness/changes/active/ui-redesign-v4/**` | done | `d06b71b`, `11e2823`, `af91e77`, `e6e314e`, `4cbd5f1`, `9b34bd2`, `6da63f3` — all 5 gates green + 72 screenshots across 4 Android profiles (`evidence/board_1.jpg`..`board_6.jpg`) |

## Completion definition

- [x] Every acceptance criterion in spec.md has evidence above.
- [x] No open question was silently guessed.
- [x] Review in `reviews/review.md` recorded.
