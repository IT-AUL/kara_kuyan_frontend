# Tasks — UI redesign v4

Atomic, ordered. Each task names its writer and its verification evidence. Detailed agent specs: `.farm/tasks/RD-xx.md` (local farm folder, not committed). Branches: `farm/RD-xx`.

| # | Task | Writer | Files owned | Status | Verification evidence |
|---|---|---|---|---|---|
| RD-00 | Data layer: parse `wrong_submissions`, add student analytics + resource | lead | see plan | pending | unit tests + typecheck |
| RD-01 | Design system v4 tokens + primitives | argon | `src/design-system/**` | pending | lint/typecheck/jest + gallery screenshot |
| RD-02 | Tab bar (Главная · Проверка · Аналитика · Ещё) + Home | argon | see plan | pending | gates + screenshot vs `shots/home.png` |
| RD-03 | Onboarding + privacy priming | argon | see plan | pending | gates + screenshots vs `welcome.png`, `privacy.png` |
| RD-04 | Scan HUD + identity confirm + processing | argon | see plan | pending | gates + emulator screenshots vs `scan.png`, `who.png` |
| RD-05 | Queue (CheckScreen) + «Класс проверен» + per-sheet result | argon | see plan | pending | gates + screenshots vs `queue.png`, `done.png` |
| RD-06 | Review: swipe card + ✕/✓ + undo | argon | see plan | pending | gates + screenshot vs `review.png` |
| RD-07 | Analytics domain + hub + test results | argon | see plan | pending | domain unit tests + screenshots vs `hub.png`, `test.png` |
| RD-08 | More/sync statuses + journal export | argon | see plan | pending | gates + screenshots vs `more.png`, `journal.png` |
| RD-09 | Task breakdown + class map | argon | see plan | pending | screenshots vs `task.png`, `map.png` |
| RD-10 | Letters map + student profile | argon | see plan | pending | screenshots vs `letters.png`, `student.png` |
| RD-11 | Zavuch report | argon | see plan | pending | screenshot vs `report.png` |
| RD-12 | Assignments restyle (test new, print) | argon | see plan | pending | screenshots vs `testnew.png`, `print.png` |
| RD-99 | Route glue, emulator pass, review, release | lead | `app/_layout.tsx`, docs | pending | gates on main + device screenshots |

## Completion definition

- [ ] Every acceptance criterion in spec.md has evidence above.
- [ ] No open question was silently guessed.
- [ ] Review in `reviews/review.md` recorded.
