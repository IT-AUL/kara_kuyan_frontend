# Risks

Legend: **P** = probability, **I** = impact — `L`/`M`/`H` = low/medium/high.

| Risk | P | I | Trigger / signal | Mitigation | Owner |
|---|---|---|---|---|---|
| OCR accuracy below demo needs | M | H | Flagged rate high on real handwriting; wrong top-1 on Tatar glyphs | Benchmark matrix incl. static INT8; HITL review absorbs uncertainty; preprocessing parity with training pipeline | ocr-native-engineer |
| Device latency >3 s/sheet | M | H | Cold-run timing exceeds budget | Batched inference; runtime lane selection by benchmark; reduce per-cell overhead; worst case reduce cells/sheet | ocr-native-engineer |
| Camera integration instability | M | H | VisionCamera v5/plugin build or lifecycle failures on SDK line | CameraX-backed Expo view alternative; spike decides with device evidence | mobile-architect |
| Native memory leaks | M | H | Repeated scans grow RSS / crash | Buffer lifecycle tests; repeated-scan soak test on device | ocr-native-engineer |
| API drift / contract gaps unresolved | M | H | Backend changes or idempotency stays unspecified | `contract-gaps.md` tracking; adapter isolates contract; hand-typed models until codegen unblocked | api-contract-guardian |
| Duplicate or lost submissions on sync | M | H | Retries create dupes; kill mid-sync loses work | Atomic save+outbox; FSM with recoverable failed; stable `client_submission_uuid`; process-kill tests | mobile-architect |
| QR identity mismatch | M | M | `stu_id` absent from `qr_signature` example → wrong student | «Изменить ученика» fallback always available; clarify QR payload with backend | api-contract-guardian |
| Font glyph coverage failure | L | M | Onest cmap test fails for Ә/Ө/Ү/Җ/Ң/Һ | Noto Sans fallback already chosen; test before embedding | ux-designer |
| Privacy leak (image persistence/transit) | L | H | Any image artifact found in fs/network/logs | Zero-photo invariants + evidence gates; no JS pixel handoff; Sentry scrubbed if adopted | security-reviewer |
| Over-scoped constructor/analytics | M | M | Slices 6–7 slip or sprawl | De-scope order in `mvp-scope.md`; ready-tests-only fallback; single analytics level | product-guardian |
| Agent collisions on shared files | M | M | Two writers touch the same file | One active change; declared file ownership in tasks.md; read-only parallel analysis | lead orchestrator |
| Weak auth (`X-Teacher-UUID` bearer-equivalent) | M | H | Credential leak/replay; no rotation or revocation defined | TLS-only transport; SecureStore on device; treat as demo identity; production auth is an unresolved backend requirement (`contract-gaps.md`) | api-contract-guardian |
