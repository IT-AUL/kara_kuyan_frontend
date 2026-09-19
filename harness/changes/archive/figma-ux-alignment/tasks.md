# Tasks — Figma UX alignment

Atomic, ordered. Each task names its writer and its verification evidence.

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Create `SegmentedTabs` design system component | `src/design-system/components/SegmentedTabs.tsx` | done | typecheck ✅ |
| 2 | Create `SearchBar` design system component | `src/design-system/components/SearchBar.tsx` | done | typecheck ✅ |
| 3 | Create `BarChart` design system component | `src/design-system/components/BarChart.tsx` | done | typecheck ✅ |
| 4 | Analytics: add segmented tabs + bar chart + insight card | `src/features/analytics/AnalyticsScreen.tsx` | done | typecheck ✅ |
| 5 | Assignments: add search bar + segmented tabs + CTA | `src/features/assignments/AssignmentsScreen.tsx` | done | typecheck ✅, lint ✅ |
| 6 | Classes: add segmented tabs + add student button | `src/features/classes/ClassesScreen.tsx` | done | typecheck ✅ |
| 7 | Home: add recent activity section | `src/features/home/HomeScreen.tsx` | done | typecheck ✅ |
| 8 | Export gradebook: verify renders correctly | `src/features/analytics/ExportGradebookScreen.tsx` | done | no changes, screen untouched |
| 9 | Static quality gates | — | done | lint ✅ 0 errors, typecheck ✅, tests 3/3 ✅, check-deps ✅, doctor 21/21 ✅ |
| 10 | Device capture + Figma comparison review | evidence/ | done | 7 screenshots + 7 UI dumps on SM-S928B in evidence/; visual verification confirmed ✅ |

## Completion definition

- [x] Every acceptance criterion in spec.md has evidence above.
- [x] No open question was silently guessed.
- [x] Review in `reviews/review.md` recorded.
