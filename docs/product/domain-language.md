# Domain Language

| Term | Meaning |
|---|---|
| Assessment | A complete test/worksheet unit a teacher prepares, assigns to a class, and checks. The top-level working object. |
| Assignment / Task | A single numbered item inside an assessment: a full Tatar prompt, grammar topic, expected answer, points. (Backend API calls the container "assignment"; the product calls tasks "задания".) |
| Worksheet | The printed personalized A4 paper for one student: name, code, variant, QR, tasks, answer cells, alignment markers. |
| Offline Bundle | Backend-supplied package cached on device: expected answers, cell layout, template geometry, QR signature. Enables grading with no connectivity. |
| Submission | The structured graded result of one worksheet: scores, per-task outcomes, cell evidence, teacher overrides. The only thing that syncs. |
| OCR Evidence | Per-cell recognition detail: predicted character, confidence, top-K candidates. Supporting material for review — hidden by default. |
| Review Flag | Marker on a task the app cannot confidently resolve; routes it into the teacher review queue. |
| Teacher Override | A deliberate teacher decision on a flagged task (accept / mark wrong / adjust points). Always wins over OCR output. |
| Grading Scale | Percentage→grade mapping on the Russian 2–5 scale; a personal default plus per-assessment override. |
| Outbox | Durable local queue of submissions awaiting sync; part of the same atomic write as the saved result. |
| Insight | A restrained, evidence-backed suggestion for the teacher (e.g., topic to repeat). Optional, dismissible, never a student verdict. |

## Rules

- **OCR evidence ≠ answer correctness.** Confidence describes recognition quality, not whether the answer is right. Never collapse them into one status.
- The teacher's language is assessments and tasks, not letters and cells. Character-level data stays below the surface.
- Sync moves submissions, never images.
