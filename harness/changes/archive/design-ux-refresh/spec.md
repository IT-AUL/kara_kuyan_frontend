# Spec — Design and UX refresh

## Goal

Improve the existing static prototype so the teacher can understand the current state and next action at a glance. The refreshed UI should feel like a calm premium instrument: restrained surfaces, strong hierarchy, consistent terminology, one dominant action, and a distinctive scan/review experience.

## Non-goals

- No real camera, OCR, backend, authentication, persistence, sync, file export, or native inference implementation.
- No new generic UI kit, chart framework, bottom-sheet dependency, animation framework, or design dependency.
- No full constructor, student picker, settings, or new product module.
- No pixel-locked reproduction of Figma.
- No invented backend behavior or confidence policy.

## Assumptions

- The approved static demo data and primary journey remain the content source.
- Product brief navigation wins over the first prototype: the second tab is `Проверка`; `Классы` moves under `Ещё`.
- Review remains a required teacher decision before save; the prototype may model the reviewed state locally without persistence.
- Expo web is the rapid visual evidence surface; the connected Android phone is used when available.

## Acceptance criteria

- [x] Shared tokens and primitives create a lower-chrome surface system: fewer borders, more grouped rows, clearer type hierarchy, and AA-safe small text.
- [x] Teacher-facing chrome uses consistent Russian terminology; internal words such as `Review`, `sync`, `outbox`, `pending`, `leaderboard`, and `Privacy by design` are absent.
- [x] Bottom navigation exposes `Главная / Проверка / Задания / Ещё`; Classes remains reachable from `Ещё`.
- [x] Home emphasizes one continuation action and one insight without duplicating tab/export navigation.
- [x] Checking, result, and review screens each expose one dominant forward action; review decisions return to the sheet result and unlock a save-and-next state.
- [x] Scan, result, analytics, assignments, classes, more, and export screens follow the refreshed visual hierarchy without adding functional claims.
- [x] Interactive selection and statuses have non-color cues and appropriate accessibility roles/labels.
- [x] The approved static journey and all four tabs remain clickable with zero horizontal overflow at 360px, 390px, and 1024px.
- [x] Lint, typecheck, unit tests, Expo dependency check, and Expo doctor pass.
- [x] Rendered before/after evidence and an independent non-writer review are recorded.

## Open questions

- Physical Android rendering and TalkBack depend on the phone being connected during verification; if unavailable, record them as residual device risks rather than guessing.
