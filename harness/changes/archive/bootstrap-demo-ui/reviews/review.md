# Review — Bootstrap + interactive demo UI

Independent review. Written by someone other than the implementing writer.

## Verdict

approve

## Evidence check

- [x] Every spec acceptance criterion has matching recorded evidence.
- [x] Claimed test/build outputs were actually produced, not narrated:
  - `pnpm run lint` → exit 0
  - `pnpm run typecheck` → exit 0
  - `pnpm test --runInBand` → 1 suite, 3 tests passed
  - `pnpm run check-deps` → dependencies up to date
  - `pnpm run doctor` → 21/21 checks passed
  - `fc-scan` on bundled Onest 400/500/600/700 TTFs → all required Tatar glyphs covered (`Ә/ә`, `Ө/ө`, `Ү/ү`, `Җ/җ`, `Ң/ң`, `Һ/һ`)
  - Web flow audit (`evidence/kara-flow-report.json`) → 15/15 navigation steps reached expected routes; `document.documentElement.scrollWidth - clientWidth` was `0` at 390px and 1024px
  - Rendered screenshots in `evidence/` were inspected for the home, checking, scan, processing, student, result, review, analytics, export, and tab screens

## Deviations from plan

| Deviation | Justified? | Note |
|---|---|---|
| Pinned `expo-doctor@1.20.4` | Yes | Makes Expo validation reproducible and avoids resolving a newly published CLI during verification. |
| Removed `android.edgeToEdgeEnabled` from `app.json` | Yes | Expo SDK 57 schema rejects the property; `expo-doctor` passed after removal. |
| Promoted `AssessmentCard` to design system | Yes | Removed the initial feature-to-feature import and made the shared card data-driven. |

## Issues found

All findings from the initial independent review were resolved and re-verified:

- **Feature boundary compliance:** `AssessmentCard` was moved to `src/design-system/components/AssessmentCard.tsx` and exported through `@/design-system`. `home` and `checking` now pass `assessment` and `progress` props instead of importing another feature.
- **Design tokens:** Raw paper/backdrop literals in `ScanSheetPreview.tsx` were replaced with `colors.paper`, `colors.paperMuted`, and `colors.scanBackdrop`.
- **Post-remediation gates:** lint, typecheck, tests, dependency check, doctor, click-through routes, and horizontal overflow checks all passed again.

## Residual risks

- Real Android-device rendering, TalkBack behavior, camera/OCR native-memory processing, API sync, SQLite persistence, and durable outbox behavior remain outside this change.
- The OpenAPI draft still has unresolved contract errors; API client generation remains blocked until the backend contract is repaired.
