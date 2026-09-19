# Review — Design and UX refresh

Independent review. Written by someone other than the implementing writer.

## Verdict

accept-with-notes

## Evidence check

- [x] Every spec acceptance criterion has matching recorded evidence.
- [x] Claimed lint, typecheck, test, dependency, doctor, journey, and responsive outputs were produced.
- [x] Click-through evidence shows expected routes and accessible button/tab roles.
- [x] Responsive metrics show zero horizontal overflow across 13 routes at 360px, 390px, and 1024px.
- [x] Before artifacts exist in `harness/changes/archive/bootstrap-demo-ui/evidence/`; refreshed artifacts exist in this change's `evidence/`.
- [ ] Physical Android rendering and TalkBack pass were unavailable because `adb` listed no connected device; no pass is claimed.

## Deviations from plan

| Deviation | Justified? | Note |
|---|---|---|
| Device verification unavailable | Yes | The connected Samsung disappeared from adb before this change's device gate; recorded as a residual risk per spec. |
| Restored `/check` as a redirect alias | Yes | Preserves old deep links while the visible destination moved to the Проверка tab. |
| Generated Android project moved outside repo | Yes | Restores the approved CNG/prebuild repository state and makes Expo doctor reproducible; generated files were retained under `/tmp`. |

## Issues found

All blocking findings from the audit and implementation review were resolved:

- Mixed `Review/sync/outbox/pending` chrome was replaced with consistent Russian teacher language.
- The second tab is now `Проверка`; Classes moved under `Ещё`.
- Card/list border density was reduced through tonal surfaces and grouped rows.
- Home was reduced to active work plus one class insight.
- Review decisions return to the result, resolve the pending task visually, and unlock the save-and-next action.
- Export selection now has radio semantics, selected state, and a visible check cue.
- Lead screenshot review found and fixed mobile tab-label clipping, compressed Home header copy, and cramped privacy/sync composition.

Non-blocking notes from independent UX review:

- The Home insight uses a full-width secondary button; acceptable as the card's only action, but a future polish pass may consider a lighter text action.
- Decorative worksheet typography uses local 10px styles; it is isolated mock-paper content rather than application chrome.
- Review necessarily exposes two grading decisions plus a back action; the filled/secondary/ghost hierarchy is acceptable but can be refined after device testing.

## Confirmed strengths

- Materially calmer and more modern visual hierarchy without a generic UI kit or gradient-heavy AI aesthetic.
- AA-safe faint text contrast: at least 4.97:1 on every current dark surface.
- One dominant forward action across checking, result, review, and scan screens.
- Status and selection states use text/icons/roles rather than color alone.
- Full static journey and navigation remain clickable after the IA correction.

## Residual risks

- Physical Android rendering, edge-to-edge system insets, status/navigation bar contrast, and TalkBack behavior remain unverified until the phone reconnects.
- Real camera alignment motion, haptics, OCR states, persistence, sync, and export remain intentionally outside this static design change.
