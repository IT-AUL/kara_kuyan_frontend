# AGENTS.md

## Project
- Kara Kuyan: Android-first Expo app for Tatar language teachers; scans paper worksheets, grades, and surfaces class insight.
- Zero-photo: camera frames are processed in native memory and discarded; they are never persisted or transmitted.
- Expo SDK 57 app: the scan → result → review → save flow runs on a real camera with on-device OCR (in-memory save); backend client, persistence and sync are not implemented yet. See `docs/STATUS.md`.

## Context Loading
- Order: `AGENTS.md` → `docs/ECL.md` → active change in `harness/changes/active/` (if present) → `docs/STATUS.md` → task-specific docs.
- Read `docs/adr/` before touching anything an ADR covers.

## Current State
- Expo custom-development client, approved demo UI, native OCR module (`modules/ocr-native`) and the real scan flow exist; see `docs/STATUS.md`.
- Package manager: `pnpm`. Core gates: `pnpm run lint`, `pnpm run typecheck`, `pnpm test --runInBand`, `pnpm run check-deps`, `pnpm run doctor`.

## Boundaries
- No application implementation without an active structured change in `harness/changes/active/`.
- Source-driven library selection: pick from current official docs/evidence, not stale defaults.
- One writer per file; parallel work is read-only analysis.
- No raw camera frames outside native memory; no JS/base64 pixel processing.
- No direct `fetch`, SQL, or native-runtime calls from UI components — go through ports/adapters.
- Update the relevant ADR before making architecture changes.
- Do not invent backend semantics; record open contract questions instead.

## Structured Work
- Small Change vs Structured Change rules live in `docs/ECL.md`.
- One active change at a time; follow spec → plan → tasks → review lifecycle.

## Verification
- Never claim tests or builds exist or pass unless you ran them.
- Report evidence (command + output) for every completion claim.

## Package Manager
- `pnpm@12.4.1`; use the committed lockfile and do not create a second lockfile.

## Commit Attribution
- Agents commit under their own identity (e.g., `Devin`); never impersonate the user or another agent.
