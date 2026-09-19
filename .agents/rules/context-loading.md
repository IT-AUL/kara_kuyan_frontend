# Context Loading Order

Before starting any task, load context in this exact order:

1. `AGENTS.md` — project summary, boundaries, verification rules
2. `docs/ECL.md` — change lifecycle (small vs structured, one-active-change)
3. Active change in `harness/changes/active/` (if present) — current work spec/plan/tasks
4. `docs/STATUS.md` — current state, approved decisions, blocked items
5. Task-specific docs from `docs/` subdirectories as needed

Read `docs/adr/` before touching anything an ADR covers. Know what is decided before deciding anything.
