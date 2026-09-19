# Roadmap — Vertical Slices

Ordered slices. Each has an outcome, dependencies, acceptance, and a de-scope note. No dates, no estimates.

## 1. Bootstrap + design-system shell

- **Outcome:** Expo dev-client scaffold, typed routes, tokenized design system, four-tab shell with empty states.
- **Depends on:** nothing (first active change).
- **Acceptance:** dev client builds on the reference phone; tokens/components render in Storybook; TalkBack labels present.
- **De-scope:** Storybook can lag one slice; shell polish minimal.

## 2. P0 camera + runtime spikes

- **Outcome:** camera path chosen (VisionCamera v5 vs CameraX view), ONNX runtime lane chosen by device benchmark, OpenCV/ArUco + QR approach proven.
- **Depends on:** slice 1 scaffold; user's physical phone; model artifacts.
- **Acceptance:** zero JS pixel copies demonstrated; full-sheet latency measured cold/warm; recorded in the change's review.
- **De-scope:** ExecuTorch lane skipped unless ONNX lanes all fail the ≤3 s budget.

## 3. API boundary + offline bundle

- **Outcome:** contract-typed API client (manual or codegen if contract repaired), offline-bundle fetch + cache, roster sync.
- **Depends on:** slice 1; backend answers for behavior-affecting contract gaps. Hand-typed wire schemas may implement only fields actually documented — no invented semantics.
- **Acceptance:** offline bundle drives a sheet definition with no network at scan time.
- **De-scope:** codegen can be deferred in favor of hand-typed contract models.

## 4. Scan → review → save loop

- **Outcome:** the core demo loop — align, identify, result, flagged-task review with auto-advance, atomic save.
- **Depends on:** slices 2–3.
- **Acceptance:** ≤3 s stable-frame→result on device; teacher override persists; OCR evidence hidden unless opened.
- **De-scope:** cell-evidence detail view can be minimal.

## 5. Durable outbox + sync

- **Outcome:** atomic submission+outbox, FSM, retry/backoff, batch-sync to backend.
- **Depends on:** slice 4; backend-defined idempotency, re-check, and partial-failure semantics — assumptions are not acceptable for these behavior-affecting gaps.
- **Acceptance:** process-kill and airplane-mode tests pass; no duplicates beyond backend-tolerated resend.
- **De-scope:** conflict-resolution UI — simplest defined behavior per backend semantics.

## 6. Constructor + print

- **Outcome:** pick ready test or assemble tasks → configure → batch printable PDFs.
- **Depends on:** backend constructor endpoints.
- **Acceptance:** a class set of personalized worksheets is produced from the app.
- **De-scope:** ready-made tests only; custom-task creation can be cut.

## 7. Analytics + export

- **Outcome:** assessment/student/class views with three core metrics, one recommendation, gradebook export.
- **Depends on:** synced submissions.
- **Acceptance:** demo insight visible; export produces xlsx/csv.
- **De-scope:** single analytics level (assessment) acceptable; export via share sheet acceptable.

## 8. Demo hardening

- **Outcome:** seeded demo data, rehearsal pass of the 10-step runbook, fallback assets, quality gates green.
- **Depends on:** slices 4–7.
- **Acceptance:** `docs/delivery/demo-runbook.md` executes cleanly on the device.
- **De-scope:** anything that doesn't appear in the demo script.
