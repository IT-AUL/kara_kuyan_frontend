# Plan — app-self-update

## Approach
Pure domain (`src/domain/update`) decides; `src/ports/app-updater.ts` defines the ports; adapters: GitHub Releases (fetch JSON) and a new local Expo module `modules/app-updater` (Kotlin: ABI list, install permission, download+SHA-256 with progress, FileProvider install intent). Feature `src/features/update` (hook + banner). Wired in `src/composition.ts`; banner mounted once in `app/_layout.tsx`.
Rejected: `expo-updates` (needs an update server; no native updates); reusing `ocr-native` (must stay backend-free, ADR 0002/0005).

## File ownership
| File / area | Writer |
|---|---|
| `modules/app-updater/**`, `src/domain/update/**`, `src/ports/app-updater.ts`, `src/adapters/app-updater/**`, `src/features/update/**`, `docs/adr/0008-*` | Claude (new files) |
| `src/composition.ts`, `app/_layout.tsx` | other agent's active files — Claude makes one small append/insert each at the end, after re-reading |

## Risks
- Unknown-sources permission flow differs per OEM → open `ACTION_MANAGE_UNKNOWN_APP_SOURCES` and re-check on resume; verify on the S24.
- 100 MB download on mobile data → show size; user taps to start.
- Manifest merge conflict with other FileProviders → own `FileProvider` subclass and authority.
- Second active change vs ECL "one active" → user-approved exception, disjoint files.

## Deviations
(filled at review time)
