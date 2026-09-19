# Kara Kuyan

Kara Kuyan is an Android-first mobile companion for Tatar language teachers that turns a phone camera into a fast, private checker for paper-based assessments.

Teacher workflow:

> **Prepare → Print → Scan → Review → Grade → Understand → Act**

## Hackathon MVP

- Teacher-only demo with a preconfigured teacher; no authentication screen.
- Create or pick an assessment, print personalized worksheets, scan completed sheets, review uncertain tasks, save, and see class insight.
- Works offline in the classroom; results sync when connectivity returns.

## Zero-photo promise

Camera images never leave the teacher's phone. Rectification, QR decoding, cell cropping, and OCR inference run on-device in memory; only structured results (letters, statuses, scores) are stored and synced. See `docs/architecture/security-privacy.md`.

## Demo story

1. Open the active assessment.
2. Scan a personalized worksheet — student and variant are identified automatically.
3. See the full result: tasks, points, percentage, grade.
4. Review one uncertain task; the teacher has the final say.
5. Save and scan the next sheet.
6. Show class analytics, a teaching recommendation, and gradebook export.

## Status

**Working prototype.** The Expo app (custom dev client, Android) scans a printed worksheet with the phone camera, recognises the answers on the device (nothing image-derived is stored or sent), shows per-task results, lets the teacher review uncertain answers, and saves in memory. Backend sync, persistence, constructor/print and analytics wiring are not done yet. Current state: `docs/STATUS.md`.

## Documentation

- `AGENTS.md` — agent operating guide
- `docs/STATUS.md` — current state and open items
- `docs/product/product-brief.md` — full product brief
- `docs/architecture/mobile.md` — mobile architecture
- `docs/design/design-direction.md` — design direction
- `docs/delivery/roadmap.md` — delivery plan
