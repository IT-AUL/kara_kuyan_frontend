# Spec — Scan → result → review → save (real camera)

WHAT and WHY only.

## Goal

Replace the static demo behind the existing `scan`, `processing`, `student-identified`, `assessment-result` and `task-review` screens with the real pipeline: live camera in the scan screen, on-device recognition, task-level results against the expected answers, teacher review with override, and save-and-scan-next. This is roadmap slice 4 with in-memory state.

## Non-goals

- No SQLite/outbox/sync, no backend client, no constructor/print, no analytics/export wiring (slices 3, 5–7).
- No student roster from the backend: a small demo roster stands in.
- No calibration of confidence thresholds (proposed values stay marked as such).
- No iOS; no redesign of screens beyond the states the real flow needs.

## Assumptions

- The offline bundle is a committed fixture (`tools/sheet-gen/fixtures/bundle.json`); the live `offline-bundle` endpoint returned 500 (contract-gaps 21). The port hides the source.
- Sheet template constants are the authors' server constants (`docs/contracts/ocr-server-pipeline-reference.md`), verified on the backend's real `blank.pdf`.
- Camera: CameraX inside `modules/ocr-native`; frames are processed in native memory and never reach JS (ADR 0003).
- Inference lane: FP32 + XNNPACK, 6 threads (ADR 0005). Models are pushed to the app-private dir for now (packaging/download is a later decision).

## Acceptance criteria

- [x] **AC1** The scan screen shows a live native camera preview; JS never receives pixel data (typed boundary carries numbers/text only).
- [x] **AC2** Alignment feedback (searching / aligning / locked / processing, with hints) drives the UI; capture happens automatically when locked and stable, or by tap.
- [x] **AC3** A capture yields structured evidence, and the result screen shows real per-task statuses (Верно / Ошибка / Требует проверки / Не выполнено), points, percentage and grade for the recognised sheet; character evidence stays hidden by default.
- [x] **AC4** (accept path exercised; reject path covered by unit tests only) Flagged tasks open in task review; accept / mark wrong overrides the outcome, recomputes the score and auto-advances.
- [x] **AC5** Save records the result in memory, updates checking progress and offers "scan next"; batch never re-asks class/test.
- [x] **AC6** Student identity: name field text and QR (assessment/variant) are surfaced; "Изменить ученика" lets the teacher pick from the demo roster.
- [~] **AC7** (implemented: only `aruco-4-point` / `marker-homography` accepted, else `NOT_ALIGNED`; not exercised on a real hidden-corner sheet) A hidden/damaged corner marker or a failed rectification never produces a result: the UI stays in "searching" with a hint.
- [~] **AC8** Stable frame → result screen ≤ 3 s, measured on SM-S928B cold and warm. One sample: 1725 ms; more samples needed.
- [~] **AC9** (files, gallery and logs clean; network capture not done) Zero-photo evidence: no image file created, no image bytes on the network, none in logs during scans (commands + output).
- [x] **AC10** Static gates pass (lint, typecheck, tests, check-deps, doctor); domain/application logic has unit tests.

## Open questions

- How the recognised name maps to a roster entry (fuzzy match vs teacher pick) — product/backend decision; the fallback is the teacher's pick.
- Confidence thresholds and blank-cell rule — need handwriting data (parked spike).
- Camera permission UX and denied-state copy (Russian).
