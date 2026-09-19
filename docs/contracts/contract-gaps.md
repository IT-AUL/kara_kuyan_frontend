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

15. **Sheet geometry missing:** `template_geometry` (offline bundle) gives only format `A4`, ArUco dictionary/ids and `cell_dimensions_mm` 10×10. It does not give ArUco marker size or position, answer-row origins, cell pitch/layout, or the QR position, so the app cannot crop cells from a rectified sheet. `p0-camera-runtime-spike` uses a documented fixture layout; the real layout must come from the backend/PDF generator. Not to be inferred client-side.
16. **Blank-cell contract:** the bundle marks only a trailing space as `is_empty_allowed`; the model has no blank class. Behaviour for a missing or partially empty answer is defined client-side by an ink-fraction pre-filter in the spike (`src/domain/ocr/decision.ts`, proposed thresholds) and needs product/backend confirmation.
17. **Model class order differs from the OCR guide (confirmed by the authors' pipeline description, `docs/contracts/ocr-server-pipeline-reference.md`; still to verify on handwriting):** the guide (and the earlier manifest) put `Ә` at index 38; the supplied FP32/INT8 models behave as if `Ә` is index 1 and every later letter is shifted by one (measured, `p0-camera-runtime-spike/evidence/class-order-finding.md`). Using the guide's order would mislabel almost every recognised letter. Needs confirmation from the model authors and a manifest that ships the authoritative order.
18. **Preprocessing contract conflict:** `ocr-integration-reference.md` (trim 3–5%, square pad, resize) vs the authors' "updated block" (trim 8%, ink segmentation, 46 px centring, blank rule ink < 30 px). Prose leaves canvas fill, percentile basis and interpolation open. Source code (`blank_pipeline.py`, `tatar_ocr_dataset.py`) requested.
19. **Live backend (`https://tatar-ocr.duckdns.org`)** was down (HTTP 502) earlier on 2026-09-19 and restored later the same day; its OpenAPI is now saved as `docs/contracts/openapi-live-2026-09-19.json` (SHA-256 `5f2e19e8…1113`) and differs from the committed draft — see "Live OpenAPI" below.
20. **Student-name field:** the authors' template has a handwritten 16-cell name field; the contract and product describe printed name + QR identity.
23. **Submission size:** a sheet with every cell (8 questions × 9 cells) is ≈ 7.8 KB of JSON, against the 1–2 KB / ~35 KB per class in the docs (the docs' example lists only some cells). Does the backend need all cells, or only flagged/overridden ones?
24. **Override granularity:** the backend records `teacher_override` per cell; the app's teacher decides per answer. We map an accepted/rejected answer onto its non-matching cells (`CORRECT` / `WRONG`). Needs confirmation.

## Clarified by the backend source (commit 796601e, 2026-09-19; `docs/contracts/ocr-server-pipeline-reference.md`)

These describe current server *code*, not a documented contract; confirm with the backend owners before depending on them.

| Gap | What the code shows |
|---|---|
| 9 confidence threshold | `0.65` is a hardcoded default at teacher creation, not derived from data → the threshold decision is ours (AC8 calibration). |
| 10 QR identity | QR carries only `tid/var/page/tot/n_q`. Student identity comes from the 16-cell name field (printed when the PDF is requested with `student_id`), or the teacher. |
| 11 batch sync | Upsert by global `client_submission_uuid`; last write wins; all-or-nothing request, no per-item result; missing uuid → server generates one (resend duplicates); `POST /submissions` always inserts. |
| 14 auth | Any `X-Teacher-UUID` self-registers; submissions do not check it. |
| 15 geometry | Bundle has no coordinates; the server hardcodes them (documented in the reference note). Client must hardcode the same template, ideally versioned. |
| 16 blank cell | Server rule: empty if total ink < 30 px after ink segmentation. |
| 17 class order | Confirmed: `Ә` at index 1 (`model_registry.json`, `TATAR_UPPERCASE`). |
| 18 preprocessing | Source obtained; ported exactly (`tools/ocr-lab/preprocess_server.py`). Kotlin must mimic Python banker's rounding. |
| 20 name field | Printed into the 16 cells on request, otherwise blank for handwriting. |
| 8 grading | Still open: the server stores whatever `final_grade` the client sends; the API-doc example (7/8 → 4) is inconsistent with the 85% scale. |

Still open: repo has no licence (permission to reuse needed); accuracy claims conflict (96.97% guide vs 94.28% registry, both on the authors' data); `realdataset/` access; live server down (502).
21. **`GET /api/v1/assignments/TAT-2026-Q1/offline-bundle` returns HTTP 500** (plain-text "Internal Server Error") with and without `?variant=1`, on 2026-09-19. Metadata (`GET /assignments/TAT-2026-Q1`) says `total_variants: 2`; `ready-tests` says `questions_count: 8`; but `blank.pdf?variant=1` has **4** question blocks (QR `n_q: 4`). The offline bundle — the input for offline grading — could not be fetched; the bundle shape was verified only from source (`constructor.py`).
22. **Title collides with corner marker:** in the live `blank.pdf` the header title runs up to the top-right ArUco marker (id 1); ArUco needs a white quiet zone. Detection still worked on all renders tried; worth telling the backend.

## Live OpenAPI (fetched 2026-09-19, `openapi-live-2026-09-19.json`)

- OpenAPI 3.1.0, FastAPI-generated, 27 paths / 29 operations, validates with `openapi-spec-validator`. **All 29 operations have `operationId`, 26 document a 4xx response (422 validation), and required fields are declared** — the draft's lint defects 2–4 are largely fixed. Still: **no security scheme** (`X-Teacher-UUID` is a plain header), pagination not checked, Redocly lint not run.
- Only in live: `/api/v1/ocr/scan-blank`, `/ocr/scan-blank-upload`, `/ocr/predict-box`, legacy `/api/scan_blank`, `/api/predict_box` (server-side OCR of uploaded photos — **not to be used by the app**, ADR 0003), `/constructor/{task-types,generate,verify-answer,scan-task,scan-task-base64}`, `/health`.
- Only in the draft: `/assignments/{id}/batch-blanks.pdf`, `/constructor/tests/{test_id}/fork` (absent from the live server).
- Codegen is no longer blocked by lint, but the semantic gaps above remain; the live spec, not the draft, should become the reference once the offline-bundle 500 is resolved.

## Live spec update (fetched 2026-09-19 evening, `openapi-live-2026-09-19b.json`, SHA-256 `22d29198…de08`)

- **Added:** `GET /api/v1/model/manifest` (no auth): model name/version, 39-class alphabet (**Ә at index 1 — confirms our measured order**), `sha256` `b55481b4…` (= the `.pth`, matches ours), and a `PreprocessingSpec`. **Added fields:** `HandwritingMetrics`, `handwriting_*` on class/student analytics and the performance row. No operations removed or changed; still no security scheme.
- **Gap 21 resolved:** `GET /assignments/TAT-2026-Q1/offline-bundle` now returns 200 (1 variant, 4 questions; metadata earlier said 2 variants — mismatch to ask).
- **27. Preprocessing spec differs from the source we ported:** manifest says `margin_trim_pct 11`, `ink_min_area_pixels 35`, bbox padding 2, occupancy 46, background 250, ink offset 22; the code at 796601e (and our Kotlin port) uses trim **8%**, empty if total ink **< 30 px**, min component area 18. Either the server changed after 796601e or the manifest is documentation only. Needs the authors' answer and a parity check (our fixtures) before we change the port; do not adopt silently.
- **28. Handwriting metrics** (quality %, correction rate, low-confidence rate, unclear characters) are computed server-side from per-cell confidences we send; usable for the class insight screen, but the formula is undocumented.

- **29. Template drift:** the live `blank.pdf` now has 8 mm name cells (was 9 mm); bundle/manifest carry no template version or geometry. The client now finds the name cells from printed lines, but a versioned template (gap 15) is still needed.

## Consequence

**Codegen is blocked.** Orval/generated client work may not start until the contract passes lint and the semantic questions above are answered by the backend. Track answers here or in an updated contract revision; do not invent semantics client-side.
