# Plan — UI redesign v4

## Approach

Orchestrated agent farm on the home PC (`ssh pc`, Ubuntu, 16 threads / 32 GB). The lead (Antigravity, on the Mac) cuts the work into tasks with **disjoint file sets**, writes a chewed-up spec per task (`.farm/tasks/RD-xx.md`), launches each task as a separate Gemini 4 Argon (`agy --model gemini-4-argon-high`) process in its own git worktree and branch `farm/RD-xx`, then reviews, screenshots and merges into `main` one by one.

Waves (a wave starts only after the previous one is merged and green):

| Wave | Tasks | Why this order |
|---|---|---|
| 0 | RD-00 data layer (lead, local) | Analytics needs `wrong_submissions` + student analytics parsed; adapter work stays with the lead |
| 1 | RD-01 design system | Every screen depends on the new primitives and tokens |
| 2 | RD-02 home+tabs · RD-03 onboarding · RD-04 scan HUD+identity · RD-05 queue+done · RD-06 review · RD-07 analytics domain+hub+test results · RD-08 more/sync+journal | Independent screens on disjoint files |
| 3 | RD-09 task breakdown+class map · RD-10 letters+student · RD-11 zavuch report · RD-12 assignments restyle | Need RD-07 domain helpers |
| 4 | Lead: route glue, emulator pass, review, release | — |

Rejected: one agent doing everything (slow, context blow-up); letting agents touch shared files (merge hell); adding `react-native-svg` (native rebuild + new dep; all charts in v4 are bars/strips/grids that `View` handles).

## Design-system contract (RD-01 delivers, everyone else consumes)

Tokens added to `src/design-system/tokens.ts` (existing names unchanged):
`surfaceHigh #212B26`, `grade5 #25E38A`, `grade4 #5CC8F0`, `grade3 #F5B942`, `grade2 #FF6B6B`, `zoneOk #25E38A`, `zoneMid #F5B942`, `zoneBad #FF6B6B`, `ruleSin #B69CFF`, `ruleLetter #5CC8F0`, `ruleAllo #F5B942`, `ruleMiss #FF8FB1`; `radius.xxl = 24`, `radius.sheet = 28`.

Components (each in `src/design-system/components/<Name>.tsx`, exported from `src/design-system/index.ts`):

| Component | Props (exact) |
|---|---|
| `Tag` | `{ label: string; tone: 'ok' \| 'mid' \| 'bad' \| 'info' \| 'neutral' \| 'rule'; color?: string; icon?: AppIconName }` |
| `Avatar` | `{ name: string; size?: number; ring?: 'done' \| 'review' \| 'none'; onPress?: () => void }` (initials from name) |
| `AvatarStack` | `{ names: string[]; max?: number; size?: number }` |
| `GradePill` | `{ grade: 2 \| 3 \| 4 \| 5; size?: number }` |
| `ProgressStrip` | `{ total: number; done: number; review?: number; height?: number }` |
| `SegmentBar` | `{ segments: { value: number; color: string; label?: string }[]; height?: number; showCounts?: boolean }` |
| `DeltaTag` | `{ value: number; suffix?: string }` (green up / red down) |
| `MiniBars` | `{ values: number[]; height?: number; color?: string; highlightLast?: boolean }` (sparkline replacement) |
| `AccuracyBar` | `{ label: string; value: number; caption?: string; onPress?: () => void }` (zone color by thresholds 50/80) |
| `HeroCard` | `{ children: ReactNode; glow?: boolean }` (gradient surface + soft glow) |
| `BottomSheet` | `{ visible: boolean; onClose: () => void; children: ReactNode; title?: string }` (Modal, scrim, grab, spring in) |
| `Toast` | `{ message: string; actionLabel?: string; onAction?: () => void; visible: boolean }` |
| `SegmentedTabs` | keep current props; restyle to v4 (surface track, raised active pill) |
| `Button` | keep props; add `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger'` visuals per v4 (primary glow shadow, 56 dp) |

Pure helpers in `src/design-system/zones.ts`: `zoneOf(pct)` → `'ok'\|'mid'\|'bad'`, `zoneColor(pct)`, `gradeColor(g)`, `initials(name)`; unit-tested in `src/design-system/zones.test.ts`.

## File ownership

| File / area | Writer |
|---|---|
| `src/adapters/api/backend.ts`, `src/data/hub.ts`, `src/adapters/api/*.test.ts` | RD-00 (lead) |
| `src/design-system/**` | RD-01 |
| `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/insights.tsx` (new), `src/features/home/HomeScreen.tsx`, `src/features/home/components/**` | RD-02 |
| `src/features/onboarding/**`, `app/onboarding.tsx` | RD-03 |
| `src/features/checking/ScanScreen.tsx`, `src/features/checking/StudentIdentifiedScreen.tsx`, `src/features/checking/ProcessingScreen.tsx`, `src/features/checking/components/ScanHud.tsx` (new), `src/features/checking/components/StudentIdentityCard.tsx`, `src/features/checking/components/SheetWarnings.tsx` | RD-04 |
| `src/features/checking/CheckScreen.tsx`, `src/features/checking/CheckDoneScreen.tsx` (new), `app/check-done.tsx` (new), `src/features/checking/AssessmentResultScreen.tsx`, `src/features/checking/components/ResultSummaryCard.tsx`, `src/features/checking/components/TaskResultRow.tsx` | RD-05 |
| `src/features/checking/TaskReviewScreen.tsx`, `src/features/checking/components/ReviewCard.tsx` (new) | RD-06 |
| `src/domain/analytics/**` (new), `src/features/analytics/AnalyticsScreen.tsx`, `src/features/analytics/TestResultsScreen.tsx` (new), `src/features/analytics/data.ts` (new), `app/analytics.tsx`, `app/analytics-test.tsx` (new) | RD-07 |
| `src/features/home/MoreScreen.tsx`, `app/(tabs)/more.tsx`, `src/features/analytics/ExportGradebookScreen.tsx` | RD-08 |
| `src/features/analytics/TaskAnalysisScreen.tsx`, `ClassMapScreen.tsx` (new), `app/analytics-task.tsx`, `app/analytics-map.tsx` (new) | RD-09 |
| `src/features/analytics/LettersScreen.tsx`, `StudentProfileScreen.tsx` (new), `app/analytics-letters.tsx`, `app/analytics-student.tsx` (new) | RD-10 |
| `src/features/analytics/ReportScreen.tsx` (new), `app/analytics-report.tsx` (new) | RD-11 |
| `src/features/assignments/**`, `app/test-*.tsx`, `app/task-*.tsx` | RD-12 |
| `app/_layout.tsx`, `docs/**`, `harness/**`, merges | lead |

Rule: one writer per file. Everything else is read-only analysis.

## Risks

- Argon drifts outside its files or "improves" logic → per-task allow-list + lead runs `git diff --name-only main...farm/RD-xx` and rejects anything outside it.
- Argon invents data or copy → spec gives exact copy strings and exact data sources; reviewer greps for hard-coded numbers.
- Web screenshots may not render native-only screens (camera) → agents screenshot via Expo web where possible; lead verifies every screen on the Android emulator before merge.
- PC is off / unreachable (seen 2026-11-04 10:45) → farm scripts are ready; launch waits for the user to power the PC on.

## Deviations

- Added paper-contrast tokens (`paperSurface`, `paperBorder`, `paperDivider`, `paperText`, `paperTextMuted`, `paperTextFaint`, `paperPrimary`, `paperOk`, `paperMid`, `paperBad`) to `src/design-system/tokens.ts` (`11e2823`) so `ReportScreen` (light zavuch report document sheet) meets WCAG contrast without raw `#hex` literals in `src/features/**`.
- Added `app/ds-gallery.tsx` (`84753f6`, `SafeAreaView` polish `e6e314e`) so every Design System v4 primitive can be visually verified on real Android emulators.
- Ran a 4-device Android verification matrix on `pc` (`Android 11 720×1520 320dpi 1.15x font 2GB`, `Android 13 1080×2340 440dpi 4GB`, `Android 15 Pixel 7 1080×2400 420dpi 6GB`, `Android 15 Tablet 1200×1920 280dpi 4GB`) and applied responsive polish for `360dp + 1.15x` large-font devices (`af91e77`, `4cbd5f1`, `9b34bd2`, `6da63f3`).
