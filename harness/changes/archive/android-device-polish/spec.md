# Spec — Android real-device polish

## Goal

Make every core prototype screen visually balanced and fully usable at the reference device's 384×832dp Android viewport. Primary actions, text, status cues, character comparisons, and tab labels must render inside the visible safe area without clipping or accidental wrapping.

## Non-goals

- No camera, OCR, backend, persistence, sync, or export implementation.
- No new UI framework, icon package, bottom-sheet package, or responsive dependency.
- No changes to approved demo facts or product scope.
- No attempt to remove Expo dev-client overlay chrome from a development build.

## Assumptions

- Reference device: Samsung SM-S928B, Android 16/API 36, 1080×2340 at 450dpi, 384×832dp app configuration, font scale 1.0, 3-button navigation.
- Floating `Tools` gear belongs to Expo dev-client and is excluded from product UI evaluation.
- `expo-symbols` icons render correctly on the device; no icon-engine swap is justified by current evidence.

## Acceptance criteria

- [ ] On `/scan` at scroll offset 0, the primary CTA is fully visible and at least 48dp high; no action has inverted or nav-overlapping bounds.
- [ ] On `/task-review`, both eight-character words fit inside the card; no cell or glyph reaches the screen edge.
- [ ] Result summary metrics form one balanced row at 384dp; the header does not wrap because of status chrome.
- [ ] Primary flow screens keep their forward action in a footer above the system navigation bar.
- [ ] Tab screens do not apply duplicate bottom safe-area padding; tab icons and labels fit above the system navigation bar.
- [ ] Insight/recommendation statuses use informational green; amber remains reserved for review/uncertain states; waiting states do not use a checkmark icon.
- [ ] Grouped lists have no trailing divider after the final row.
- [ ] Home, checking, assignments, more, scan, processing, student, result, review, analytics, classes, and export have post-fix Android screenshots with no visible clipping or unintended overlap.
- [ ] All clickable nodes are at least 48dp; all relevant content nodes stay within x=0…1080 and above y=2205, excluding system/dev-client chrome and scroll content below the initial fold.
- [ ] Lint, typecheck, tests, dependency check, and Expo doctor pass after generated native files are cleaned from the CNG repository state.
- [ ] Independent UX and QA reviewers accept the real-device evidence.

## Open questions

- Production screenshot validation without Expo dev-client overlay waits for a release/demo build; dev overlay is not treated as an app defect.
