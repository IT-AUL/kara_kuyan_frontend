# Review — UI redesign v4

Independent review by Antigravity (orchestrator / reviewer over Gemini 4 Argon worker branches `farm/RD-01`..`farm/RD-12`).

## Verdict

**ACCEPT** — all 7 acceptance criteria have recorded evidence, all 5 static quality gates pass on `main` (`6da63f3`), architecture and zero-photo boundaries hold, and 18 screens were visually verified across a 4-device Android emulator matrix (`Android 11 720p 1.15x font`, `Android 13 1080p`, `Android 15 Pixel 7`, `Android 15 Tablet 1200×1920`).

## Evidence check

- [x] Every spec acceptance criterion has matching recorded evidence.
- [x] Claimed test/build outputs were actually produced (not narrated).

### Acceptance criteria verification

| # | Criterion | Evidence | Status |
|---|---|---|---|
| AC1 | Design system tokens & 14 primitives exported from `@/design-system` with pure-helper unit tests | `src/design-system/index.ts`, `src/design-system/zones.test.ts` (pass), `app/ds-gallery.tsx` rendered on 4 Android profiles (`evidence/board_6.jpg`, row 3) | ✅ |
| AC2 | Redesigned screens match v4 concept (`docs/design/v4/prototype-v4.html` & `analytics-v1.html`) in structure, copy, and color roles | 72 device screenshots stitched into `evidence/board_1.jpg`..`board_6.jpg` across 4 Android devices (`360dp + 1.15x` through `Tablet 1200w`) | ✅ |
| AC3 | All 7 analytics screens (hub, test results, task breakdown, class map, Tatar letters, student profile, zavuch report) reachable and backed by `src/data/*` resources with empty/offline/error states | Routes wired in `app/_layout.tsx` (`d06b71b`); rendered with live-contract payload shapes in `evidence/board_2.jpg`..`board_4.jpg` | ✅ |
| AC4 | Analytics math (качество знаний, успеваемость, СОУ, средний балл, accuracy zones, wrong-answer grouping, letter diff) in `src/domain/analytics/` with unit tests | `src/domain/analytics/stats.ts`, `src/domain/analytics/stats.test.ts`, `src/features/analytics/report.test.ts` — all pass under `pnpm test --runInBand` | ✅ |
| AC5 | Zero-photo & architecture boundaries hold | `modules/ocr-native` and `src/adapters/sqlite/**` untouched; `hex_in_features = 0`; `react_in_domain = 0`; `ai_jargon_in_features = 0`; 0 new `@/adapters` runtime imports in UI | ✅ |
| AC6 | All 5 core gates pass on `main` (`6da63f3`) | `pnpm run lint` (0 errors, 0 warnings), `pnpm run typecheck` (0 errors), `pnpm test --runInBand` (18 suites / 107 tests passed), `pnpm run check-deps` (up to date), `pnpm run doctor` (21/21 passed) | ✅ |
| AC7 | Independent review recorded | This file (`harness/changes/active/ui-redesign-v4/reviews/review.md`) | ✅ |

### Recorded gate outputs (`main @ 6da63f3`)

- `pnpm run lint` → `$ expo lint` (exit 0, 0 warnings)
- `pnpm run typecheck` → `$ tsc --noEmit` (exit 0)
- `pnpm test --runInBand` → `Test Suites: 1 skipped, 18 passed, 18 of 19 total; Tests: 9 skipped, 107 passed, 116 total` (exit 0)
- `pnpm run check-deps` → `Dependencies are up to date` (exit 0)
- `pnpm run doctor` → `21/21 checks passed. No issues detected!` (exit 0)

### Multi-device Android matrix (`pc` KVM emulators, `app-debug.apk` `x86_64`)

1. **`kara_budget_a11`** — Android 11 (API 30), `720×1520` (`320 dpi`, `360dp`), **2 cores / 2 GB RAM**, 3-button nav, **`font_scale = 1.15`**
2. **`kara_mid_a13`** — Android 13 (API 33), `1080×2340` (`440 dpi`), **4 cores / 4 GB RAM**
3. **`kara_phone`** — Android 15 (API 35, Pixel 7), `1080×2400` (`420 dpi`), **6 cores / 6 GB RAM**, edge-to-edge gesture nav
4. **`kara_tablet_a15`** — Android 15 (API 35, Tablet), `1200×1920` (`280 dpi`), **4 cores / 4 GB RAM**

## Deviations from plan

| Deviation | Justified? | Note |
|---|---|---|
| Added `paper*` tokens to `src/design-system/tokens.ts` (`11e2823`) | Yes | Needed for high-contrast light document surface on `ReportScreen` without `#hex` literals in `src/features/**` |
| Added `app/ds-gallery.tsx` (`84753f6`, `e6e314e`) | Yes | Enabled direct device screenshot verification of all Design System v4 primitives |

## Issues found & resolved before acceptance

- **`Toast.tsx` ref access during render (`RD-01`)** — fixed in `3698c64` (`useState(() => new Animated.Value(...))[0]`).
- **`MoreScreen.tsx` / `ExportGradebookScreen.tsx` React Compiler memoization mismatch (`RD-08`)** — fixed in `c444f79`.
- **AI buzzword `"ИИ"` in `TaskPhotoScreen.tsx` & `#hex` in `ReportScreen.tsx`** — fixed in `11e2823`.
- **Responsive clipping on `Android 11 · 720×1520 · font_scale=1.15`** — caught via the 4-device matrix and fixed in `af91e77`, `e6e314e`, `4cbd5f1`, `9b34bd2`, `6da63f3`:
  - `OnboardingScreen`: shortened placeholder to `"Гөлнара Ильдаровна"`, `fontSize: 15`, compact `logoBox` top spacing.
  - `HomeScreen`: removed `selectable` on single-line header `Text` (Android `TextView` bug clipping line 2) and added `adjustsFontSizeToFit`.
  - `Button` & `SegmentedTabs`: added single-line scaling (`adjustsFontSizeToFit`) for paired buttons and 3–4 tab pills.
  - `TestResultsScreen`, `ReportScreen`, `TestDetailScreen`, `ClassMapScreen`: fixed `успеваемость` mid-word wrap, 4-column zavuch metric box scaling, `Верно` header width, duplicate bottom CTA on `TestDetailScreen`, and `ClassMapScreen` sort-tabs toolbar width (`176dp` + `flex: 1` caption).
  - `TaskAnalysisScreen`: added automatic fallback to the lowest-accuracy task when `?q=` param is omitted.

## Residual risks

- Camera-live screens (`ScanScreen` real CameraX preview, `StudentIdentifiedScreen`, `AssessmentResultScreen`, `TaskReviewScreen` swipe gesture) were verified via unit/component tests (`ReviewCard.test.tsx`, `evaluate.test.ts`, `decision.test.ts`) and static gates, because headless emulators do not feed paper ArUco sheets to CameraX; physical-sheet smoke check on the reference phone remains recommended before cutting the next release tag.
- Error-rule tags (`сингармонизм`, `буква`, etc.) are intentionally hidden unless supplied by the backend (`spec.md` open question 2 — client does not invent classification).
