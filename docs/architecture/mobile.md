# Mobile Architecture

## Dependency direction

```
routes → features/application → domain
              ↓
            ports ← adapters
```

- **routes/** — Expo Router screens; compose features only, contain no logic.
- **features/application/** — user-facing capabilities (scanning, review, assessments, analytics, export) plus the application services that orchestrate domain logic through ports. No feature-to-feature imports; shared needs go through domain or ports.
- **domain/** — framework-free TypeScript: entities, grading, outbox FSM, OCR-evidence interpretation. Imports only domain code; no React, no Expo, no I/O.
- **ports/** — interfaces the application layer calls (submission store, bundle store, OCR engine, clock, connectivity).
- **adapters/** — concrete implementations of ports: expo-sqlite/Drizzle, backend API client, native OCR bridge, SecureStore, file/share utilities. Wired in at one app composition root.

## Planned directories (at bootstrap)

```
app/                    # routes (Expo Router)
src/features/<name>/    # feature UI + hooks
src/domain/             # pure domain logic
src/ports/              # interfaces
src/adapters/           # sqlite, api, native, platform
src/design-system/      # tokens + product components
modules/ocr-native/     # local Expo module: Kotlin CV/OCR pipeline
```

## Module boundaries

- Routes import features; features/application import domain and ports; domain imports only domain.
- Adapters implement ports and are wired at one dedicated app bootstrap/composition module.
- Camera frames are consumed entirely inside the native camera/OCR implementation; the JS-facing port receives only a typed structured OCR result. The module has **no backend knowledge** — it never sees URLs, auth, or sync payloads.
- UI never calls `fetch`, SQL, or the native runtime directly; it goes through ports/adapters.
- Contract types are generated from `docs/contracts/openapi.yaml` once the contract passes lint — see `docs/contracts/contract-gaps.md`.

## State ownership

- **expo-sqlite** is the durable source of truth (assessments, submissions, outbox, review state).
- **TanStack Query** manages remote server state and connectivity-aware refetching only — never the unsynced submission outbox.
- **Camera frames** exist only inside the native module's memory; nothing pixel-related reaches JS.
- Feature-local UI state stays in the feature; cross-feature reads go through the domain/store.

## Versions

Exact dependency versions are **runtime-resolved and pinned at bootstrap** (`expo install`, `expo-doctor`), not timeless prose. Direction only: latest stable Expo line, New Architecture, Reanimated 4 + `react-native-worklets`, Expo Router typed routes, strict TypeScript, pnpm.
