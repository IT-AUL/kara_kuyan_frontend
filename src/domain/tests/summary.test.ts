import { averagePercent, gradeCounts, latestPerStudent, progressOf, studentRows, taskHits, type CheckedWork } from './summary';

const work = (id: string, score: number, grade: number, at = '2026-09-19T10:00:00', tasks?: CheckedWork['tasks']): CheckedWork => ({
  studentId: id, studentName: `Имя ${id}`, score, maxScore: 5, grade, checkedAt: at, tasks,
});

describe('test summary', () => {
  it('keeps only the latest work of a student', () => {
    const latest = latestPerStudent([work('a', 2, 3, '2026-09-19T10:00:00'), work('a', 5, 5, '2026-09-19T11:00:00'), work('b', 4, 4)]);
    expect(latest.map((w) => [w.studentId, w.score]).sort()).toEqual([['a', 5], ['b', 4]]);
  });

  it('lists students in roster order with their work or none, appending checked strangers', () => {
    const rows = studentRows([{ studentId: 'b', fullName: 'Б' }, { studentId: 'a', fullName: 'А' }], [work('a', 4, 4), work('x', 3, 3)]);
    expect(rows.map((r) => [r.studentId, r.work?.score ?? null])).toEqual([['b', null], ['a', 4], ['x', 3]]);
    expect(rows[2].name).toBe('Имя x');
    expect(progressOf(rows)).toEqual({ checked: 2, total: 3, remaining: 1, percent: 66 });
  });

  it('averages the latest percents and counts grades', () => {
    const works = [work('a', 5, 5), work('b', 3, 4), work('c', 1, 2)];
    expect(averagePercent(works)).toBe(60);
    expect(gradeCounts(works)).toEqual({ '5': 1, '4': 1, '3': 0, '2': 1 });
    expect(averagePercent([])).toBeNull();
  });

  it('counts task hits from per-task results', () => {
    const t = (n: number, correct: boolean) => ({ number: n, correct });
    const hits = taskHits([work('a', 1, 2, undefined, [t(1, true), t(2, false)]), work('b', 2, 3, undefined, [t(1, true), t(2, true)]), work('c', 0, 2)]);
    expect(hits).toEqual([{ number: 1, correct: 2, total: 2 }, { number: 2, correct: 1, total: 2 }]);
  });
});
