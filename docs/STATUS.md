# Status

## State

- Planning foundation: **complete**.
- Bootstrap + interactive demo UI: **complete and approved** (`harness/changes/archive/bootstrap-demo-ui/`).
- Design and UX refresh: **complete with device notes** (`harness/changes/archive/design-ux-refresh/`).
- Android device polish (SM-S928B): **complete and archived** (`harness/changes/archive/android-device-polish/`) — all 12 core routes verified on-device; device gate 48/48 PASS; static gates clean; independent review ACCEPT.
- Figma UX alignment: **complete and archived** (`harness/changes/archive/figma-ux-alignment/`) — SegmentedTabs, SearchBar, BarChart, analytics dynamics, and recent activities aligned with Figma; verified on SM-S928B; review ACCEPT.
- Functional application services: **not started** — no camera pipeline, OCR, backend client, persistence, or sync.

## Approved decisions

- Expo React Native, custom development client (prebuild), New Architecture only; Expo Go rejected.
- Expo SDK 57.0.24, React Native 0.86.3, React 19.2.3, pnpm 12.4.1, Node ≥22.13.
- Product-first modular architecture: routes → features/application → domain, with ports ← adapters (ADR 0002).
- Zero-photo on-device pipeline; camera frames live only in native memory (ADR 0003).
- expo-sqlite + Drizzle local source of truth with a durable outbox (ADR 0004).
- ONNX Runtime first, benchmark-driven; ExecuTorch deferred (ADR 0005 — Proposed, benchmark pending).
- UI: custom semantic tokens, no generic component kit; adopt-on-evidence list recorded in `docs/design/design-direction.md`.
- Onest approved for the current UI: bundled 400/500/600/700 TTFs cover `Ә/ә`, `Ө/ө`, `Ү/ү`, `Җ/җ`, `Ң/ң`, `Һ/һ`.

## Available inputs

- Product brief: `docs/product/product-brief.md`
- Backend contract draft: `docs/contracts/openapi.yaml` (OpenAPI 3.0.3, known gaps — see `docs/contracts/contract-gaps.md`)
- API prose spec: `docs/contracts/api-prose-reference.md`
- OCR integration guide: `docs/contracts/ocr-integration-reference.md`
- Model artifacts: FP32/INT8 ONNX + `.pth` — not committed to the repo; filenames and verified facts recorded in `docs/contracts/model-manifest.md`
- Figma reference: `https://www.figma.com/design/z6hxlS5wVdmPLsMlb2lha7/Кара-Куян?node-id=0-1`
- Initial demo UI evidence: `harness/changes/archive/bootstrap-demo-ui/evidence/`
- Refreshed design evidence: `harness/changes/archive/design-ux-refresh/evidence/`

## Completed changes

| Change | Outcome | Evidence |
|---|---|---|
| `bootstrap-demo-ui` | Expo scaffold, tokenized design system, four tabs, and clickable static demo flow approved | `harness/changes/archive/bootstrap-demo-ui/tasks.md`, `reviews/review.md`, `evidence/` |
| `design-ux-refresh` | Lower-chrome surface system, corrected tab IA, Russian status vocabulary, and review→save flow approved | `harness/changes/archive/design-ux-refresh/tasks.md`, `reviews/review.md`, `evidence/` |
| `android-device-polish` | All 12 core routes verified on Samsung SM-S928B (384×832dp); device gate 48/48 PASS; a11y labels added to MetricTile, Card, AssessmentCard, CharacterCells; static gates all green (lint, typecheck, tests, check-deps, doctor) | `harness/changes/archive/android-device-polish/tasks.md`, `reviews/review.md`, `evidence/after/` |
| `figma-ux-alignment` | Static UI prototype aligned with Figma mockups: SegmentedTabs, SearchBar, BarChart, Analytics grade dynamics & repeat topic insight, Assignments search & CTA, Classes tabs & add student, Home recent activity. Verified on-device (SM-S928B). | `harness/changes/archive/figma-ux-alignment/tasks.md`, `reviews/review.md`, `evidence/` |

## Blocked / open items

- **OpenAPI repair** — 20 lint errors; codegen blocked (see `docs/contracts/contract-gaps.md`).
- **Backend idempotency / re-check semantics** — `client_submission_uuid` upsert, ordering, partial-failure behavior unconfirmed; must not be invented client-side.
- **QR student identity gap** — `stu_id` in QR signature inconsistent between docs.
- **Grading mismatch** — 7/8 → grade 4 in API example vs scale that maps 87% → grade 5.
- **Confidence threshold conflict** — 0.65 (backend handshake) vs 0.8/0.5 bands (OCR guide).
- **Runtime/camera benchmarks** — VisionCamera v5 vs CameraX view; FP32+XNNPACK vs dynamic INT8 CPU vs static INT8. Requires the user's physical phone.
- **Android TalkBack end-to-end** — structural a11y labels added; full TalkBack flow test deferred to camera pipeline implementation.
- **Reference phone details** — Samsung SM-S928B confirmed: Android 16/API 36, 1080×2340 at 450dpi, 384×832dp. RAM/benchmark matrix still needed.
- **Weak auth model** — `X-Teacher-UUID` is bearer-equivalent demo identity; production auth/rotation/revocation is an unresolved backend requirement.
- **OS-level capture** — `FLAG_SECURE` vs demo recording on camera/result surfaces undecided.
- **Model license/version** — not embedded in ONNX metadata; manifest proposed.

## Next recommended action

Create the next active structured change for the P0 camera/runtime spike: camera path, OpenCV/QR verification, ONNX Runtime benchmark plan, and physical-device measurement protocol. Do not start API client generation until `docs/contracts/openapi.yaml` is lint-clean and backend semantics are confirmed.
