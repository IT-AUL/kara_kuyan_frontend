# Tasks — Bootstrap + interactive demo UI

Atomic, ordered. Each task names its writer and its verification evidence.

| # | Task | Files owned | Status | Verification evidence |
|---|---|---|---|---|
| 1 | Create the active structured change record | `harness/changes/active/bootstrap-demo-ui/` | done | `summary.md`, `spec.md`, `plan.md`, `tasks.md`, and `reviews/review.md` exist under `harness/changes/active/bootstrap-demo-ui/` |
| 2 | Scaffold Expo app and pin SDK-compatible toolchain | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `app.json`, `tsconfig.json`, `eslint.config.js`, `assets/` | done | `pnpm install` completed with lockfile supply-chain policy; `pnpm run check-deps` → `Dependencies are up to date`; `pnpm run doctor` → `21/21 checks passed`; `pnpm exec expo config --type introspect --json` shows SDK 57, typed routes, custom dev-client packages, and `com.karakuyan.app` |
| 3 | Add demo domain model and grading helpers via TDD | `src/domain/**`, `src/domain/**/*.test.ts` | done | `pnpm test --runInBand` → `PASS src/domain/assessment/grading.test.ts`, `3 passed, 3 total` |
| 4 | Build semantic design tokens, components, and four-tab shell | `src/design-system/**`, `app/_layout.tsx`, `app/(tabs)/**` | done | `pnpm run lint` → exit 0; `pnpm run typecheck` → exit 0; `fc-scan` on bundled Onest 400/500/600/700 TTFs → all required Tatar codepoints covered; rendered tab screenshots in `evidence/` |
| 5 | Build clickable demo journey on static seed data | `src/demo/**`, `src/features/**`, `app/*.tsx` | done | `node /tmp/kara-flow-audit.mjs http://localhost:8081` → all flow clicks reached expected routes; refreshed report copied to `evidence/kara-flow-report.json`; screenshots copied to `evidence/` |
| 6 | Run quality gates and capture visual evidence | test/lint/build config only if needed | done | Final gates: `pnpm run lint` exit 0; `pnpm run typecheck` exit 0; `pnpm test --runInBand` 3/3 passed; `pnpm run check-deps` up to date; `pnpm run doctor` 21/21 passed; flow audit shows `scrollWidth-clientWidth = 0` at 390px and 1024px |
| 7 | Independent review and lead closure notes | `harness/changes/active/bootstrap-demo-ui/reviews/review.md`, `summary.md`, `docs/STATUS.md` | done | Independent reviewer returned final `approve`; findings were remediated and re-verified. See `reviews/review.md` |

## Evidence log

### Toolchain and configuration

```text
$ pnpm --version
12.4.1

$ node --version
v22.22.2

$ pnpm install
Lockfile passes supply-chain policies
Done using pnpm v12.4.1

$ pnpm run check-deps
$ expo install --check
Dependencies are up to date

$ pnpm run doctor
$ expo-doctor
Running 21 checks on your project...
21/21 checks passed. No issues detected!
```

`expo-doctor@1.20.4` was added as a dev dependency so the validation command is reproducible. The first doctor run found `android.edgeToEdgeEnabled` outside the SDK 57 app schema; the property was removed and the rerun passed.

### Static analysis and tests

```text
$ pnpm run lint
$ expo lint
# exit 0

$ pnpm run typecheck
$ tsc --noEmit
# exit 0

$ pnpm test --runInBand
PASS src/domain/assessment/grading.test.ts
  assessment demo grading
    ✓ floors sheet percentage for teacher-facing display
    ✓ maps demo percentage to the product example grade
    ✓ summarizes class checking progress

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

A mistyped command `pnpm test -- --runInBand` was attempted first and Jest treated `--runInBand` as a test pattern. The corrected command above passed.

### Font coverage

```text
$ fc-scan --format "%{charset}" node_modules/@expo-google-fonts/onest/*/Onest_*.ttf
```

Parsed coverage for the bundled 400/500/600/700 fonts confirmed all required Tatar codepoints:

```text
Ә/ә, Ө/ө, Ү/ү, Җ/җ, Ң/ң, Һ/һ
all Tatar codepoints covered
```

### Rendered flow audit

The Expo web preview was started with `pnpm exec expo start --web --port 8081`. Chrome DevTools Protocol emulation was used for screenshots and measurements because direct Chrome `--window-size=390 --screenshot` produced a misleading cropped artifact.

```text
$ node /tmp/kara-flow-audit.mjs http://localhost:8081
```

Results after the shared-component remediation:

- `/` → clicked `Продолжить` → `/check`
- `/check` → clicked `Сканировать следующую` → `/scan`
- `/scan` → clicked `Смоделировать скан` → `/processing`
- `/processing` → clicked `Показать ученика` → `/student-identified`
- `/student-identified` → clicked `Открыть результат` → `/assessment-result`
- `/assessment-result` → clicked `Проверить отмеченные` → `/task-review`
- `/task-review` → clicked `Принять ответ` → `/analytics`
- `/analytics` → clicked `Экспорт журнала` → `/export-gradebook`
- `/export-gradebook` → clicked `Подготовить файл` → prepared state
- `/export-gradebook` → clicked `Готово` → `/`
- Tabs clicked: `Задания` → `/assignments`, `Классы` → `/classes`, `Ещё` → `/more`, `Главная` → `/`

At every checked 390px route and at the 1024px home route:

```text
document.documentElement.scrollWidth - document.documentElement.clientWidth = 0
```

Artifacts:

- `evidence/kara-flow-report.json`
- `evidence/kara-flow-00-home.png`
- `evidence/kara-flow-01-check.png`
- `evidence/kara-flow-02-scan.png`
- `evidence/kara-flow-03-processing.png`
- `evidence/kara-flow-04-student.png`
- `evidence/kara-flow-05-result.png`
- `evidence/kara-flow-06-review.png`
- `evidence/kara-flow-07-analytics.png`
- `evidence/kara-flow-08-export.png`
- `evidence/kara-flow-09-prepared.png`
- `evidence/kara-flow-11-home-1024.png`
- `evidence/kara-flow-tab-assignments.png`
- `evidence/kara-flow-tab-classes.png`
- `evidence/kara-flow-tab-more.png`

### Scope guard

Repository search found no `fetch`, camera runtime, OCR, ONNX/OpenCV, SQLite/Drizzle, AsyncStorage, file-system image persistence, or VisionCamera implementation. The only `camera` match is an icon name in `AppIcon.tsx`.

### Independent review

Initial review found and the implementation resolved:

- Cross-feature `home → checking` import of `AssessmentCard` → moved to data-driven `src/design-system/components/AssessmentCard.tsx`.
- Raw mock colors in `ScanSheetPreview.tsx` → replaced by `colors.paper`, `colors.paperMuted`, and `colors.scanBackdrop`.
- Pending task statuses → synchronized here.

Follow-up independent review verdict: **approve**.

## Completion definition

- [x] Every acceptance criterion in spec.md has evidence above.
- [x] No open question was silently guessed.
- [x] Review in `reviews/review.md` recorded.
