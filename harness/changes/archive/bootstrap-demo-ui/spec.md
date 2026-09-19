# Spec — Bootstrap + interactive demo UI

WHAT and WHY only. No implementation detail.

## Goal

Deliver a working Expo application foundation and a visually coherent, clickable UI prototype of the core teacher journey:

`Главная → Проверка → Скан → Обработка → Ученик → Результат → Review → Аналитика → Экспорт`

The prototype lets the team evaluate navigation, information hierarchy, dark visual direction, and the demo story before wiring real camera, OCR, backend, or sync behavior.

## Non-goals

- No real camera access, frame processing, OpenCV, QR decoding, ONNX runtime, or OCR output.
- No backend calls, API client, authentication, OpenAPI repair, or invented backend semantics.
- No SQLite, Drizzle, durable outbox, offline sync, or process-kill behavior.
- No implementation of all 16 Figma frames; only the approved demo flow plus four tabs.
- No application store/release configuration.
- No claim that simulated scan/review behavior is functional recognition.

## Assumptions

- Latest stable Expo packages are resolved and pinned during bootstrap with Expo tooling.
- Android-first remains the product target; Expo web may be used only as a fast visual review surface.
- JavaScript tabs are used because native tabs are still treated as unstable for this project.
- Static demo data may represent the agreed scenario: teacher Каримова Гөлнара Илдар кызы, class 7-А, Контрольная работа №3, 8 tasks, 18/25 checked, 4 review items, and Галиев Амир Р. with 7/8, 87%, grade 5.
- Figma remains a navigation and mood reference, not a pixel-locked implementation spec.
- Onest may be adopted only after its bundled font coverage is verified; otherwise the UI uses a verified fallback.

## Acceptance criteria

- [x] Expo scaffold, package manifest, lockfile, TypeScript config, lint config, and app config exist and use the custom-development-client direction.
- [x] New Architecture and typed Expo Router are enabled; no workflow depends on Expo Go.
- [x] Semantic design tokens and reusable product components exist; screens do not sprinkle unrelated raw styling values.
- [x] Four tabs exist and the approved demo journey is clickable end to end on static data.
- [x] Demo content matches the agreed product facts, including Tatar educational text and the flagged `ӨСТӘЛДӘН / ӨСТӘЛТӘН` review case.
- [x] Domain demo logic has unit tests; lint, typecheck, tests, and Expo validation commands have recorded outputs.
- [x] A rendered visual review artifact or preview evidence is recorded.
- [x] No camera, OCR, API, persistence, sync, or pixel-handling implementation is present.

## Open questions

- Resolved: bundled Onest 400/500/600/700 font files pass the required Tatar cmap check.
- Resolved: Expo web plus Chrome DevTools Protocol emulation is the fast visual evidence surface until a physical Android build is available.
