# Plan — Figma UX alignment

HOW the spec is delivered.

## Approach

Add missing UX elements screen-by-screen, using Figma design context for exact layout, spacing, and text. All data is static mock. Reuse existing design system tokens and components (Card, MetricTile, StatusBadge, ListRow). Create new lightweight components only where needed (SegmentedTabs, SearchBar, BarChart).

Rejected alternatives:
- Full screen rebuild — wasteful; existing screens are 80%+ correct.
- Wait for Phase 2 — user explicitly requested alignment now.

## File ownership

| File / area | Writer |
|---|---|
| `src/features/analytics/AnalyticsScreen.tsx` | Antigravity |
| `src/features/analytics/components/` | Antigravity |
| `src/features/assignments/AssignmentsScreen.tsx` | Antigravity |
| `src/features/assignments/components/` | Antigravity |
| `src/features/classes/ClassesScreen.tsx` | Antigravity |
| `src/features/classes/components/` | Antigravity |
| `src/features/home/HomeScreen.tsx` | Antigravity |
| `src/features/home/components/` | Antigravity |
| `src/design-system/components/SegmentedTabs.tsx` [NEW] | Antigravity |
| `src/design-system/components/SearchBar.tsx` [NEW] | Antigravity |
| `src/design-system/components/BarChart.tsx` [NEW] | Antigravity |

Rule: one writer per file. Everything else is read-only analysis.

## Risks

- Bar chart without a library — mitigate by using simple View-based bars (no SVG dependency needed for 3 static bars)
- Tab state management — mitigate by using local React state (no router changes)
- Screen height overflow — mitigate by wrapping in ScrollView where needed

## Deviations

_Recorded during execution._
