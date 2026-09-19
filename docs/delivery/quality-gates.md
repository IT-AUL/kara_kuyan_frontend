# Quality Gates

Gates define what must be true. Status on 2026-09-19 (items still marked "TBD at bootstrap" below are not set up yet):

| Gate | State | Evidence / command |
|---|---|---|
| Static (lint, types, unit tests, deps, doctor) | ✅ passing | `pnpm run lint`, `pnpm run typecheck`, `pnpm test --runInBand` (26 tests), `pnpm run check-deps`, `pnpm run doctor` (21/21) |
| Native build | ✅ | `cd android && ANDROID_HOME=~/Library/Android/sdk ./gradlew :app:installDebug` (BUILD SUCCESSFUL) |
| OCR parity / model | ✅ | `harness/changes/parking/p0-camera-runtime-spike/evidence/device-selftest.md` |
| Device performance | ✅ inference; ⚠️ end to end has 1 sample (1725 ms tap→result) | `evidence/benchmark.md`, `scan-check-flow/evidence/live-scan.md` |
| Privacy (zero-photo) | ⚠️ files, gallery, logs clean; **network capture not done** | `scan-check-flow/evidence/live-scan.md` |
| UI / accessibility | ⚠️ 48 dp and labels checked earlier; TalkBack on the real flow pending | `android-device-polish` |
| E2E (Maestro), Storybook | ⏳ not set up | — |
| Contract lint | ⚠️ live spec passes `openapi-spec-validator`; Redocly not run | `docs/contracts/contract-gaps.md` |


## 1. Docs / contracts

- Draft integrity (now): `docs/contracts/openapi.yaml` SHA-256 remains the recorded value `2dd20dbb0d9e44a8ffdfd7de85c1b0158f7f6cc0361598ec45932623f226594e`.
- Future codegen gate: a **revised** contract passes lint before codegen — `TBD at bootstrap` (Redocly CLI version pinned then). The current draft is known-failing and is not required to be lint-clean.
- Markdown links resolve; ADR index consistent.

## 2. TypeScript / domain

- Typecheck, lint, unit tests for domain logic — `TBD at bootstrap` (jest-expo + RNTL; runner per Expo compatibility).
- No feature-to-feature imports; domain has no React/Expo imports (lint rule or structural test — TBD at bootstrap).

## 3. Native

- Kotlin module builds inside the dev client; OCR module returns typed results — `TBD at bootstrap`.
- No backend types inside the native module (boundary check).

## 4. Privacy

- Filesystem evidence: scan run produces zero image artifacts — `TBD at bootstrap`.
- Network evidence: capture shows no image bytes in requests — `TBD at bootstrap`.
- Logs/crash: no pixel data or base64 blobs — `TBD at bootstrap`.

## 5. Device performance

- ≤3 s stable-frame → usable sheet result, cold and warm, on the user's physical phone — `TBD at bootstrap`.
- 60 fps target on scan-alignment and list scrolling — `TBD at bootstrap`.

## 6. UI / accessibility

- 48 dp targets, AA contrast, non-color status semantics — `TBD at bootstrap`.
- TalkBack pass on scan → review → save on device — `TBD at bootstrap`.
- Font cmap test for Tatar glyphs — `TBD at bootstrap`.
- Storybook state coverage per `docs/design/quality-bar.md` — `TBD at bootstrap`.

## 7. E2E / demo

- Maestro journey: open → scan → review → save → insight → export — `TBD at bootstrap`.
- Demo runbook executes end-to-end with seeded data — `TBD at bootstrap`.

## Evidence rule

A gate passes only with recorded evidence (command + output, capture, or reviewed artifact). Claims without evidence are not completions.
