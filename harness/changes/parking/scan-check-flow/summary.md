# Change: scan-check-flow

- **ID:** scan-check-flow
- **Status:** parked (2026-09-19, at the user's direction, to start `durable-outbox`)
- **Created:** 2026-09-19
- **Owner (lead):** Claude
- **One-line goal:** Make the teacher's core loop real in the app: scan a printed worksheet with the phone camera, get per-task results, review uncertain tasks, and save — on-device, zero-photo.
- **Blocker (if parked):** Deprioritised for slice 5; resume (do not fork) for the leftovers below.

## Done with evidence (see `evidence/`)
Live CameraX scan → auto-capture → on-device recognition → results → review → in-memory save on SM-S928B (`live-scan.md`); real paper + handwriting check and robust line filter (`paper-handwriting.md`); QR-based sheet validation with a catalog of known assignments; ADR 0006. Acceptance: AC1–AC6 and AC10 met; AC7–AC9 partial.

## Not done (remain open)
- AC8: only one latency sample (1725 ms tap→result); more samples for median/p95.
- AC9: network capture during a scan (files, gallery and logs already clean).
- AC7: rejection screens not exercised with a real wrong sheet or hidden corner on the phone UI.
- Handwriting calibration of decision thresholds (10 calibration sheets + `score_photos.py` ready, photos pending).
- Independent review (`reviews/review.md`) and archival by the lead.
