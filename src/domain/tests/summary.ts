// Pure summaries of one test for one class: who has been checked, grades, per-task hit counts.
// Students are listed in roster order (never ranked by score: no leaderboards).

export type TaskResult = { number: number; correct: boolean };

export type CheckedWork = {
  studentId: string;
  studentName: string;
  score: number;
  maxScore: number;
  grade: number;
  checkedAt: string;
  tasks?: readonly TaskResult[];
};

export type RosterEntry = { studentId: string; fullName: string };

export type StudentRow = { studentId: string; name: string; work: CheckedWork | null };

export const percentOf = (w: Pick<CheckedWork, 'score' | 'maxScore'>): number =>
  w.maxScore > 0 ? Math.floor((w.score / w.maxScore) * 100) : 0;

/** Latest work per student (a rescanned sheet replaces the earlier one). */
export function latestPerStudent(works: readonly CheckedWork[]): CheckedWork[] {
  const byStudent = new Map<string, CheckedWork>();
  for (const w of works) {
    const prev = byStudent.get(w.studentId);
    if (!prev || prev.checkedAt < w.checkedAt) byStudent.set(w.studentId, w);
  }
  return [...byStudent.values()];
}

/** Roster order first; checked students not on the roster (transferred, removed) are appended. */
export function studentRows(roster: readonly RosterEntry[], works: readonly CheckedWork[]): StudentRow[] {
  const latest = new Map(latestPerStudent(works).map((w) => [w.studentId, w]));
  const rows: StudentRow[] = roster.map((s) => ({ studentId: s.studentId, name: s.fullName, work: latest.get(s.studentId) ?? null }));
  const known = new Set(roster.map((s) => s.studentId));
  for (const [id, w] of latest) if (!known.has(id)) rows.push({ studentId: id, name: w.studentName, work: w });
  return rows;
}

export function averagePercent(works: readonly CheckedWork[]): number | null {
  const latest = latestPerStudent(works);
  if (latest.length === 0) return null;
  return Math.round(latest.reduce((sum, w) => sum + percentOf(w), 0) / latest.length);
}

export type GradeCounts = Record<'5' | '4' | '3' | '2', number>;

export function gradeCounts(works: readonly CheckedWork[]): GradeCounts {
  const counts: GradeCounts = { '5': 0, '4': 0, '3': 0, '2': 0 };
  for (const w of latestPerStudent(works)) {
    const key = String(Math.min(5, Math.max(2, Math.round(w.grade)))) as keyof GradeCounts;
    counts[key] += 1;
  }
  return counts;
}

export type TaskHit = { number: number; correct: number; total: number };

/** How many checked works got each task right (needs per-task results; empty when the server sent none). */
export function taskHits(works: readonly CheckedWork[]): TaskHit[] {
  const map = new Map<number, TaskHit>();
  for (const w of latestPerStudent(works)) {
    for (const t of w.tasks ?? []) {
      const hit = map.get(t.number) ?? { number: t.number, correct: 0, total: 0 };
      hit.total += 1;
      if (t.correct) hit.correct += 1;
      map.set(t.number, hit);
    }
  }
  return [...map.values()].sort((a, b) => a.number - b.number);
}

export type Progress = { checked: number; total: number; remaining: number; percent: number };

export function progressOf(rows: readonly StudentRow[]): Progress {
  const total = rows.length;
  const checked = rows.filter((r) => r.work !== null).length;
  return { checked, total, remaining: total - checked, percent: total === 0 ? 0 : Math.floor((checked / total) * 100) };
}
