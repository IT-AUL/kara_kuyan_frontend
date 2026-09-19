# Tasks — Android real-device polish

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Audit reference device with screenshots and uiautomator | read-only | done | Major defects D1 scan CTA clipping and D2 review cell overflow reproduced on SM-S928B; before screenshots + dumps in `evidence/before/` |
| 2 | Implement Screen footer and tab safe-area ownership | `src/design-system/components/Screen.tsx`, pipeline screens, tab roots, `app/(tabs)/_layout.tsx` | done | `kara-scan-after.xml`: CTA bounds `[56,…][1024,…]` fully above y=2205; `kara-home-after.xml` tab labels pass `y2 <= 2205` in gate |
| 3 | Fix result/review responsive layouts and status semantics | result/review components, status/list primitives | done | `kara-review-after.xml`: ≥16 glyphs, maxX ≤ 1024; `kara-result-after.xml`: metric tops within 10px (one row) |
| 4 | Polish home/analytics/assignments/list density | feature screens, `ListRow.tsx` | done | After screenshots in `evidence/after/`; `ListRow` plain minHeight raised 64→72 after gate flagged 126px row |
| 5 | Run static quality gates | verification only | done | `pnpm run lint` exit 0; `pnpm run typecheck` exit 0; `pnpm test --runInBand` 3/3 passed; `pnpm run check-deps` "Dependencies are up to date"; `pnpm run doctor` "21/21 checks passed. No issues detected!" |
| 6 | Capture all core routes on Samsung and validate bounds | verification only | done | 12 screenshots + 12 UIAutomator dumps in `evidence/after/`. `device_gate.py` → **48 PASS, 0 FAIL**: all clickable ≥48dp, all content within x=0..1080, all above nav bar y=2205, all tab bounds clean. Exclusions: Expo dev-client overlay (spec-excluded), Android navigationBarBackground (edge-to-edge standard). |
| 7 | Independent UX/QA review and lead closure | `reviews/review.md`, change docs, `docs/STATUS.md` | done | Review recorded in `reviews/review.md` below |

## Completion definition

- [x] Every acceptance criterion in spec.md has evidence above.
- [x] No open question was silently guessed.
- [x] Review in `reviews/review.md` recorded.

## Accessibility fixes (added during review)

- MetricTile: `accessibilityLabel` = "label: value, detail" for TalkBack
- Card: `accessibilityLabel` prop passthrough
- AssessmentCard: summary label = "title. class. progress"
- CharacterCells (TaskReviewScreen): row-level + cell-level labels, mismatch callout
