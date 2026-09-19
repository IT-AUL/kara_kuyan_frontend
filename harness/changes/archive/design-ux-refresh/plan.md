# Plan — Design and UX refresh

## Approach

1. Reduce visual chrome at the system level: brighten faint text, tighten radii, make cards tonal and borderless by default, and add grouped/plain row treatment.
2. Correct information architecture and vocabulary before polishing individual screens.
3. Simplify Home to active work + one insight; make Проверка the second tab and expose Classes from Ещё.
4. Model the static review completion through a route parameter so the result screen can switch from required review to a single save-and-next action.
5. Refine scan/review/export selection semantics and all remaining screens using existing React Native primitives only.
6. Render 360/390/1024 evidence, run the complete click-through, verify on Android if connected, then request independent UX review.

Rejected: adding a generic Material kit (would erase product character); introducing bottom-sheet/animation dependencies in this visual-only change (not justified by evidence); adding backend or OCR behavior (outside scope).

## File ownership

| File / area | Writer |
|---|---|
| `src/design-system/**` | frontend-engineer |
| `src/features/**` | frontend-engineer |
| `app/(tabs)/_layout.tsx`, thin tab routes | frontend-engineer |
| `harness/changes/active/design-ux-refresh/**` | Devin lead; review file by independent reviewer |
| `docs/STATUS.md` | Devin lead at closure |

Rule: one writer per file. Everything else is read-only analysis.

## Risks

- Visual cleanup removes too much affordance → keep borders for selected/interactive controls and use tonal grouping/dividers elsewhere.
- Static review state becomes misleading → label it as prototype state and keep all behavior local to the route.
- Navigation change breaks typed routes → add the thin tab route first and verify with TypeScript and click-through evidence.
- Web-only polish hides Android issues → install/render on the connected Samsung when available; otherwise keep device verification explicitly open.
- Copy cleanup invents product terms → use the product vocabulary: `На проверку`, `Ожидают отправки`, `Синхронизация`.

## Deviations

None yet.
