# Spec — Figma UX alignment

WHAT and WHY only. No implementation detail.

## Goal

Bring the static prototype UI closer to the approved Figma mockups before Phase 2 (camera/runtime spike). Key missing UX elements — segmented tabs, search bar, bar chart, student actions, recent activity — should appear in the prototype so the demo reflects the intended product experience.

## Non-goals

- No functional/backend integration (all static mock data)
- No test constructor or grading scale sheet (these are deeper features for later slices)
- No student-profile screen (not in current tab routing)
- No camera pipeline or OCR changes

## Assumptions

- Figma file "Кара-Куян" (Page 1) is the source of truth for UX layout
- Design refresh deviations (branded header, metric tiles, character cells) are approved and kept
- All new UI is static demo data — no new dependencies needed

## Acceptance criteria

- [x] Analytics screen has segmented tabs (Обзор / Темы / Ученики) matching Figma
- [x] Analytics "Обзор" tab has bar chart (Динамика оценок: КР1/КР2/КР3) matching Figma
- [x] Analytics has "ТЕМА ДЛЯ ПОВТОРЕНИЯ" insight card matching Figma
- [x] Assignments screen has search bar and segmented tabs (Мои тесты / Банк заданий) matching Figma
- [x] Assignments has "⊕ Создать тест" CTA at bottom matching Figma
- [x] Classes screen has "⊕ Добавить ученика" button matching Figma
- [x] Classes screen has segmented tabs (Ученики / Тесты / Выводы) matching Figma
- [x] Home screen has "Последние активности" section with student rows matching Figma
- [x] Export gradebook renders correctly (re-verify — previous capture was corrupted)
- [x] All quality gates pass: lint, typecheck, tests, check-deps, doctor

## Open questions

- None — all elements come directly from Figma, no backend semantics invented
