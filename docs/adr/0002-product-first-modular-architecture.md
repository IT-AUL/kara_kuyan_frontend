# ADR 0002: Product-first modular architecture

**Status:** Accepted

## Context

A small hackathon app can collapse into route-level spaghetti; a heavy layered architecture can bury a 4-tab product. Alternatives (flat feature folders, full Clean Architecture) were compared; the product-first modular option was selected.

## Decision

Dependency direction: `routes → features/application → domain`, with `ports ← adapters`. Routes compose only; features never import each other; domain imports only domain code and is framework-free TypeScript; features/application orchestrate domain through ports; adapters implement ports and are wired at one app composition root. The native OCR module has no backend knowledge.

## Consequences

- Positive: testable domain, isolated features, replaceable adapters; matches the staged agent model (clear file ownership).
- Negative: more indirection than a flat app; port discipline must be enforced in review or it decays.
- Detail: see `docs/architecture/mobile.md`.
