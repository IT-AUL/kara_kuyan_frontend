# Plan — Android real-device polish

## Approach

1. Add a reusable `Screen` footer rendered outside the ScrollView but inside the safe area; migrate primary flow actions to it.
2. Remove duplicate bottom safe-area padding only on tab-root screens.
3. Reflow character comparison labels above bounded cell rows and compact result metrics into a deliberate three-column row.
4. Correct status semantics, trailing dividers, redundant exits, and excessive device-only wrapping without globally shrinking text.
5. Use hot reload for iteration, then regenerate/install the Android dev client only if native config changes.
6. Re-capture the same routes with adb screenshots and uiautomator bounds; independent agents review the after-state.

Rejected: globally reducing all typography (font scale is 1.0 and most text is readable); replacing expo-symbols (icons render on device); adding a responsive/layout package (unnecessary).

## File ownership

| File / area | Writer |
|---|---|
| `src/design-system/**` | frontend-engineer |
| `src/features/**` | frontend-engineer |
| `app/(tabs)/_layout.tsx` | frontend-engineer |
| Active change docs and final status | Devin lead |
| `reviews/review.md` | independent reviewer |

Rule: one writer per file. Everything else is read-only analysis.

## Risks

- Sticky footer reduces scroll viewport → keep content scrollable and footer compact; verify on all pipeline screens.
- Removing bottom inset from tab screens exposes content under tab bar → tab navigator owns the bottom boundary; verify actual node bounds.
- Compact metric/cell layout harms accessibility → preserve ≥48dp only for interactive targets; display-only cells may be smaller but remain legible.
- Deep-link screenshots retain old scroll position → force route/reload or scroll to top before each capture.

## Deviations

None yet.
