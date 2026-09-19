# Demo Runbook

Ten steps on the user's physical Android phone, using the seeded demo data (Каримова Гөлнара Илдар кызы · Гимназия №2 · class 7-А · Контрольная работа №3 · 8 заданий · 18/25 проверено).

## Setup

- Seeded demo data loaded: teacher, class 7-А (25 students), active assessment, 18 checked submissions, 4 flagged.
- Printed worksheets for the remaining demo students (e.g., Галиев Амир Р.).
- Airplane mode available for the offline beat; sync afterwards.
- Fallback assets to prepare before the demo: a pre-recorded scan clip and a second printed sheet in case of live OCR trouble.

## Steps

1. **Open** the app → active assessment card on Главная, one tap to continue.
2. **Show readiness** — checking progress 18/25, «Сканировать следующую» CTA.
3. **Scan** a completed worksheet — show alignment markers locking (the signature moment).
4. **Identify** — student + variant auto-resolved from QR (Галиев Амир Р. · 7A-014).
5. **Result** — full assessment result: 7 из 8 заданий · 87% · Оценка 5.
6. **Review** — open the flagged task, show expected vs written answer, decide; teacher has final control; auto-advance.
7. **Save** — one tap; «scan next» is immediately offered.
8. **Offline beat** — mention the batch ran offline; show outbox/sync indicator; toggle connectivity and watch sync confirm.
9. **Insight** — class analytics: topic to repeat (Чыгыш килеше, 11/25 errors) + evidence-backed recommendation.
10. **Export** — gradebook xlsx from the completed assessment (≤2 taps).

## Evidence for judges

- Zero-photo: no image anywhere but the camera pipeline — point to `docs/architecture/security-privacy.md` invariants; if asked, show a capture demonstrating no image bytes on the wire.
- ≤3 s: timing shown via a hidden debug/perf overlay enabled for the demo — not permanent teacher UI.
- Teacher control: the review decision changes the outcome before save.

## Recovery

- Live scan fails → replay the pre-recorded clip and continue at step 5; never improvise fake results.
- Sync endpoint down → show pending-outbox state and explain durable retry semantics.
