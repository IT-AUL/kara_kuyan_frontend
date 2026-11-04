# Plan — Production API domain switch

## Approach

1. Update `DEFAULT_API_URL` in `src/composition.ts` to `'https://api.kara-kuyan.it-aul.ru'`.
2. Extend `src/adapters/api/live.contract.test.ts` so the probe submission deliberately includes one wrong answer (e.g. on question 2) and verifies `studentAnalytics(studentId)`, `assignmentAnalytics` `wrongAnswers`, and `classAnalytics` `performanceTable` against live prod.
3. Update `docs/STATUS.md` references to the live backend URL.
4. Verify via Jest live suite (`LIVE_WRITE=1`), all 5 static gates, and an Android emulator runtime smoke test against `https://api.kara-kuyan.it-aul.ru`.
5. Record review in `reviews/review.md`, archive change, bump version to `0.2.1`, push `main` + `v0.2.1`.

## File ownership

- Lead (`Antigravity`): `src/composition.ts`, `src/adapters/api/live.contract.test.ts`, `docs/STATUS.md`, `package.json`, `app.json`, `harness/changes/**`.

## Risks

- Probe teacher data (`00000000-0000-4000-8000-00000000c0de`) stays isolated from real teachers (`X-Teacher-UUID` isolation already verified in test 1 of `live.contract.test.ts`).

## Deviations

None yet.
