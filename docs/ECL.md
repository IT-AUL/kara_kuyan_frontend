# ECL — Change Lifecycle

## Small Change vs Structured Change

- **Small Change:** a single-file edit with no behavioral or architectural impact (docs fix, comment, rename in one file). May proceed without a change record.
- **Structured Change:** anything touching behavior, architecture, contracts, design tokens, multiple files, or new dependencies. Requires a change record under `harness/changes/`.

## One active change

- Exactly one change lives in `harness/changes/active/` at a time.
- No application implementation outside an active structured change.

## File ownership

- One writer per file. The change's `tasks.md` declares file ownership; parallel agents work on disjoint file sets or read-only analysis.

## Lifecycle

1. **spec.md** — WHAT/WHY: goal, non-goals, assumptions, acceptance criteria.
2. **plan.md** — HOW: approach, file ownership, risks.
3. **tasks.md** — atomic ordered tasks with owners and verification per task.
4. **reviews/review.md** — independent review: deviations, residual risks, verdict.

A change is complete only when every acceptance criterion has recorded evidence (command + output, or reviewed artifact). "Done" without evidence is not done.

## Park / close

- Blocked or deprioritized work moves to `harness/changes/parking/` with the blocker noted in `summary.md`.
- Completed work moves to `harness/changes/archive/` after lead closure.
- Reopening a parked change resumes it — it does not fork a new one.

## Policy evolution

- These rules are fixed for now. No automatic policy evolution; changes to this document require explicit user approval.
