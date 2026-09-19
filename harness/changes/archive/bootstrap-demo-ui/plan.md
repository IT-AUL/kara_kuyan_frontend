# Plan — Bootstrap + interactive demo UI

HOW the spec is delivered.

## Approach

1. Scaffold the current stable Expo TypeScript app in a temporary directory and merge only the needed application files into this repository.
2. Resolve SDK-compatible packages through Expo tooling, pin them in the generated lockfile, and enable New Architecture plus typed routes.
3. Add the small framework-free demo domain model with tests before implementation.
4. Build semantic design tokens and reusable product components, then compose the four-tab shell and clickable demo journey from those primitives.
5. Verify with tests, lint, typecheck, Expo validation, dependency checks, and a rendered preview artifact.

Rejected alternatives:

- Native Tabs: deferred because the project treats them as unstable/alpha for this stage.
- Unistyles/Nitro: deferred until a clean SDK build proves the added native dependency is worth it.
- Generic component kits: rejected by the design direction.
- Real camera/OCR/API/SQLite: explicitly outside this UI-prototype change.

## File ownership

| File / area | Writer |
|---|---|
| `package.json`, lockfile, app config, TypeScript/lint/test config | frontend-engineer |
| `app/` routes and layouts | frontend-engineer |
| `src/domain/` demo types/logic/tests | frontend-engineer |
| `src/design-system/` tokens/components | frontend-engineer |
| `src/features/` demo-flow presentation | frontend-engineer |
| `src/demo/` static seed data | frontend-engineer |
| `assets/` generated/needed local visual assets | frontend-engineer |
| `harness/changes/active/bootstrap-demo-ui/` | lead |
| `docs/STATUS.md` final state update | lead |

Rule: one writer per file. Everything else is read-only analysis.

## Risks

- Scaffold may conflict with existing repository files → scaffold in `/tmp`, merge deliberately, and preserve docs/harness.
- Package resolution may pull a newer Expo line than previously researched → resolve with current official tooling and pin actual versions.
- Onest may not contain all required Tatar glyphs → run a cmap check; fall back to Noto Sans if needed.
- Web preview cannot prove Android chrome or performance → use it only for layout/visual evidence; physical-device checks remain pending.
- Static prototype may be mistaken for implemented functionality → label scan/processing screens as simulated and record the non-goals.

## Deviations

Recorded during execution: what changed vs this plan and why — filled at review time.
