# MVP Scope

## Primary user

Teacher of Tatar language and literature. Hackathon demo uses a preconfigured teacher — no authentication screen, no student or parent app.

## MVP capabilities

- Create an assessment: pick a ready test from the task bank, assemble from task items, or add a simple custom task.
- Configure title, class, variants, and grading scale (default personal scale + per-assessment override).
- Print personalized A4 worksheets (name, code, variant, QR, alignment markers).
- Scan completed sheets: on-device rectification, QR student/variant identification, cell OCR, answer comparison.
- Review uncertain tasks only; teacher can accept, mark wrong, or adjust points; auto-advance through the review queue.
- Compute points, percentage, and grade (Russian 2–5 scale).
- Work offline for a class batch (~25 sheets); sync structured results when online.
- Show restrained class/assessment/student analytics and one evidence-based teaching recommendation.
- Export a gradebook (.xlsx / .csv) after a completed assessment.

## Non-goals

- Student or parent-facing apps, accounts, or messaging.
- School CRM, administration, timetable, or broad BI dashboards.
- Public student leaderboards or ranking UX.
- Generic OCR utility positioning; letter-level evidence is supporting detail, not the product.
- Language switcher or localization in the prototype (Russian UI, Tatar educational content only).
- Multiple simultaneous assessments workflow polish beyond the demo path.

## Measurable success

- Full demo journey runs end-to-end on the user's physical Android phone.
- ≤3 seconds from stable frame to usable sheet result on that device.
- Zero-photo invariant holds: no image persisted or transmitted (verified by filesystem/network observation).
- A complete offline class batch (~25 sheets) checks and later syncs without loss or duplication.
- Teacher stays in control: every uncertain item is reviewable and overridable.

## Current assumptions

- Backend supplies rosters, printable PDFs, offline bundles, analytics, and exports per `docs/contracts/openapi.yaml` (draft — has known gaps).
- Supplied ONNX artifacts are the OCR baseline; runtime choice is benchmark-driven.
- Demo data follows the product brief (teacher, class 7-А, Контрольная работа №3).

## Kill / de-scope order

1. Analytics depth beyond the three core metrics and one recommendation.
2. Constructor sophistication (fork, public bank, advanced filters) — fall back to ready-made tests only.
3. Export — manual/share-sheet fallback acceptable.
4. Fancy design flourishes (Skia charts, bottom sheets, Unistyles) — adopt-on-evidence only.
5. Offline durability hardening beyond single-device batch + outbox.

The zero-photo invariant, the ≤3s scan loop, and teacher review control are never de-scoped.
