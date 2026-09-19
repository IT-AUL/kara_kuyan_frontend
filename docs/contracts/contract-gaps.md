# Contract Gaps — OpenAPI Draft

## Provenance

- Machine-readable contract (preserved unchanged): `docs/contracts/openapi.yaml` — OpenAPI 3.0.3, SHA-256 `2dd20dbb0d9e44a8ffdfd7de85c1b0158f7f6cc0361598ec45932623f226594e`.
- Prose source: `docs/contracts/api-prose-reference.md` (byte-for-byte copy of the supplied specification).
- Validation: Redocly CLI **2.52.1** → **20 errors, 42 warnings**. User deferred repair; this file records blockers for backend handoff.

## Lint-level defects

1. **All 20 operations lack applied `security`.** The `TeacherUUID` apiKey scheme is declared but never applied.
2. **All 20 operations lack `operationId`** — no stable generated client method names.
3. **No operation documents a 4xx response** and there is no common error envelope.
4. **Most response and nested submission schemas omit `required`** — generated TypeScript would mark core fields optional.
5. **`X-Teacher-UUID` is duplicated as manual header parameters** with inconsistent `required` flags (one `required: true`, one `required: false` parameter component) instead of the security scheme.
6. **Pagination unspecified** — roster/submission/analytics list endpoints define no page/limit/cursor shape.
7. **Binary responses under-specified** — PDF (`blank.pdf`, `batch-blanks.pdf`) and `.xlsx` gradebook responses do declare `type: string, format: binary`, but filename/`Content-Disposition`, size limits, and error behavior are missing; the `.xlsx` path plus `format=csv` parameter leaves response negotiation ambiguous.

## Semantic gaps

8. **Grading mismatch:** the sample scale maps 85%→grade 5, but the submission example records 7/8 (87%) as `final_grade: 4`. Scale application vs stored grade must be reconciled.
9. **Confidence mismatch:** backend handshake supplies `confidence_flag_threshold: 0.65`; the OCR guide defines ≥80%/50–79.9%/<50% bands. Which value drives flagging is undecided.
10. **QR student identity gap:** the architecture example QR contains `stu_id`, but the offline-bundle `qr_signature` example (`{"tid","var","page","tot","n_q"}`) does not — student identification source is ambiguous.
11. **Batch-sync semantics missing:** no per-item partial-failure shape, no idempotent-update behavior for `client_submission_uuid`, no ordering/last-write rule, no re-check conflict semantics.
12. **Leaderboard conflict:** the API exposes `students_performance_table` (a ranked performance table); the product forbids public leaderboard UX. Client must present class insight, never a ranked list.
13. **Heatmap language:** backend docs mention class heatmaps; product requires a restrained ranked topic list — presentation rules govern.
14. **Weak authentication model:** `X-Teacher-UUID` is a bearer-equivalent static identifier — acceptable as a demo identity, but not strong production authentication. Production auth, credential rotation, and revocation are unresolved backend security requirements.

## Consequence

**Codegen is blocked.** Orval/generated client work may not start until the contract passes lint and the semantic questions above are answered by the backend. Track answers here or in an updated contract revision; do not invent semantics client-side.
