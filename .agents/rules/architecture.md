# Architecture Decision Routing

When a task involves an architectural, API-contract, native-module, data-model, or design decision, consult — do not restate — the canonical sources:

- Module boundaries, state ownership: `docs/architecture/mobile.md`, ADR 0002
- Zero-photo / privacy: `docs/architecture/security-privacy.md`, ADR 0003
- Offline / sync semantics: `docs/architecture/offline-sync.md`, ADR 0004
- OCR pipeline / model contract: `docs/architecture/ocr-pipeline.md`, `docs/contracts/model-manifest.md`, ADR 0005
- API surface and known gaps: `docs/contracts/openapi.yaml`, `docs/contracts/contract-gaps.md`
- Design direction and gates: `docs/design/design-direction.md`, `docs/design/quality-bar.md`

If a decision changes any of these, update the relevant ADR first (or record an open question), then implement. Never invent backend semantics; unresolved contract questions go to `docs/STATUS.md` open items.
