# Boundaries & Constraints

## Implementation guard

- No application implementation without an active structured change in `harness/changes/active/`.
- One active change at a time; follow spec → plan → tasks → review lifecycle per `docs/ECL.md`.

## Dependency direction (ADR 0002)

- `routes → features/application → domain`, with `ports ← adapters`.
- Routes compose only — no logic in route files.
- No feature-to-feature imports; shared needs go through domain or ports.
- Domain is framework-free TypeScript: no React, no Expo, no I/O.
- Adapters implement ports and are wired at one app composition root.

## Zero-photo (ADR 0003)

- No raw camera frames outside native memory.
- No JS/base64 pixel processing.
- No image bytes in: SQLite, filesystem, network, JS, logs, crash reports, analytics, automated screenshots.
- Submission payloads contain only characters, statuses, confidences, scores (~1–2 KB/sheet).

## Ports/adapters (ADR 0002)

- No direct `fetch`, SQL, or native-runtime calls from UI components — go through ports/adapters.
- The native OCR module has no backend knowledge.

## Contract fidelity

- Do not invent backend semantics; record open contract questions in `docs/contracts/contract-gaps.md`.
- Do not claim contract readiness until lint evidence exists.
- Unresolved backend behavior (idempotency, ordering, partial failure) is recorded, never assumed.

## Library selection

- Source-driven: pick from current official docs/evidence, not stale defaults.
- No generic component kit (Material, Paper); custom semantic tokens + product components.
- Adopt-on-evidence: Unistyles, Gorhom Bottom Sheet, FlashList, Skia, chart lib, Sentry — only when verified to work with current SDK.

## File ownership

- One writer per file; parallel work is read-only analysis.
- File ownership declared in the active change's `tasks.md`.

## Package manager

- `pnpm@12.4.1`; use the committed lockfile; do not create a second lockfile.
- Never use npm or yarn.

## Commit attribution

- Agents commit under their own identity (e.g., `Antigravity`); never impersonate the user or another agent.
