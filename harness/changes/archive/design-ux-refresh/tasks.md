# Tasks — Design and UX refresh

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Audit screenshots, flows, primitives, copy, and product navigation | read-only | done | Lead pixel review plus independent `ux-designer` and `product-guardian` audits identified IA, hierarchy, terminology, border density, action, and accessibility issues |
| 2 | Refresh tokens and shared primitives | `src/design-system/**` | done | Borderless tonal Card, grouped ListRow, compact header, accessible status/radio cues; contrast measurement: `textFaint #82948A` is 6.02:1 on background, 5.51:1 on surface, 4.97:1 on raised surface |
| 3 | Correct tab IA, vocabulary, and core checking loop | `app/(tabs)/**`, `src/features/home/**`, `src/features/checking/**`, `src/features/home/MoreScreen.tsx` | done | Flow report: Home → Проверка → Scan → Processing → Student → Result → Review → reviewed result → save-next; all clicks reached expected paths |
| 4 | Refine analytics, assignments, classes, and export surfaces | `src/features/analytics/**`, `src/features/assignments/**`, `src/features/classes/**` | done | Screenshots in `evidence/`; Russian copy, grouped rows, 74% mean, radio roles + selected check icon |
| 5 | Run quality and responsive gates | verification only | done | Final lint/typecheck clean; Jest 3/3; dependencies current; doctor 21/21; `git diff --check` clean; 39 route/viewport checks at 360/390/1024 report overflow 0 |
| 6 | Install and inspect on connected Android phone | verification only | blocked — device unavailable | `adb devices -l` returned an empty device list. Physical rendering and TalkBack recorded as residual risk; no pass claimed |
| 7 | Independent visual review and lead closure | `reviews/review.md`, `tasks.md`, `summary.md`, `docs/STATUS.md` | done | Independent UX verdict `accept-with-notes`; QA found no code-level blocking issue; lead reviewed rendered pixels at 360/390/1024 and fixed tab clipping/header density before closure |

## Evidence log

### Final technical gates

```text
$ pnpm run lint
$ expo lint
# exit 0

$ pnpm run typecheck
$ tsc --noEmit
# exit 0

$ pnpm test --runInBand
PASS src/domain/assessment/grading.test.ts
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total

$ pnpm run check-deps
Dependencies are up to date

$ pnpm run doctor
Running 21 checks on your project...
21/21 checks passed. No issues detected!

$ git diff --check
# exit 0
```

The generated `android/` directory from the interrupted `expo run:android` attempt was moved, not deleted, to `/tmp/kara-kuyan-generated-android-design-refresh`. `/android` and `/ios` are ignored because this repository uses the approved CNG/prebuild direction.

### Responsive and journey gate

`evidence/kara-refresh-report.json` records:

- 12-step teacher journey with every click resolving to the expected route.
- Four tabs: `Главная / Проверка / Задания / Ещё`.
- `Ещё → Классы` resolves to `/classes` while Classes stays hidden from the tab bar.
- 13 routes checked at each of 360px, 390px, and 1024px.
- All 39 responsive checks: `scrollWidth === clientWidth`, horizontal overflow `0`.

Rendered evidence includes 390px journey states plus Home at 360px, 390px, and 1024px. The lead visually inspected the images and corrected tab-label clipping, Home header compression, and cramped privacy/sync composition before the final capture.

### Device gate

```text
$ adb devices -l
List of devices attached
```

No device was connected. Android rendering, system insets, and TalkBack remain unverified and are not claimed.

## Completion definition

- [x] Every acceptance criterion in spec.md has evidence above.
- [x] No open question was silently guessed.
- [x] Review in `reviews/review.md` recorded.
