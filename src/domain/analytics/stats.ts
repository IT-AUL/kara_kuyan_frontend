import type { GradeCounts } from '@/domain/tests/summary';

export type { GradeCounts };
export type Zone = 'ok' | 'mid' | 'bad';

function totalCount(g: GradeCounts): number {
  return g['5'] + g['4'] + g['3'] + g['2'];
}

export function qualityPct(g: GradeCounts): number | null {
  const n = totalCount(g);
  if (n <= 0) return null;
  return Math.round(((g['5'] + g['4']) / n) * 100);
}

export function successPct(g: GradeCounts): number | null {
  const n = totalCount(g);
  if (n <= 0) return null;
  return Math.round(((g['5'] + g['4'] + g['3']) / n) * 100);
}

export function failPct(g: GradeCounts): number | null {
  const n = totalCount(g);
  if (n <= 0) return null;
  return Math.round((g['2'] / n) * 100);
}

export function sou(g: GradeCounts): number | null {
  const n = totalCount(g);
  if (n <= 0) return null;
  return Math.round(((g['5'] * 1 + g['4'] * 0.64 + g['3'] * 0.36 + g['2'] * 0.16) / n) * 100);
}

export function averageGrade(g: GradeCounts): number | null {
  const n = totalCount(g);
  if (n <= 0) return null;
  const avg = (5 * g['5'] + 4 * g['4'] + 3 * g['3'] + 2 * g['2']) / n;
  return Math.round(avg * 10) / 10;
}

export function zoneOf(pct: number): Zone {
  if (pct < 50) return 'bad';
  if (pct < 80) return 'mid';
  return 'ok';
}

export type AnswerGroup = {
  answer: string;
  count: number;
  students: { id: string; name: string }[];
};

export function groupWrongAnswers(
  wrong: readonly { studentId: string; studentName: string; writtenAnswer: string }[],
): AnswerGroup[] {
  const groups = new Map<string, AnswerGroup>();
  for (const item of wrong) {
    const key = item.writtenAnswer.trim().toLocaleLowerCase('ru');
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.students.push({ id: item.studentId, name: item.studentName });
    } else {
      groups.set(key, {
        answer: key,
        count: 1,
        students: [{ id: item.studentId, name: item.studentName }],
      });
    }
  }
  return [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.answer.localeCompare(b.answer, 'ru');
  });
}

export type LessonPlanItem =
  | { kind: 'class'; questionNumber: number; prompt: string; accuracyPct: number; topAnswer: AnswerGroup | null }
  | { kind: 'individual'; students: { id: string; name: string }[] };

export function lessonPlan(
  questions: readonly {
    number: number;
    prompt: string;
    accuracyPct: number;
    wrongAnswers: readonly { studentId: string; studentName: string; writtenAnswer: string }[];
  }[],
  works: readonly { studentId: string; studentName: string; grade: number; checkedAt?: string }[],
): LessonPlanItem[] {
  const items: LessonPlanItem[] = [];

  let worst: (typeof questions)[number] | null = null;
  for (const q of questions) {
    if (!worst || q.accuracyPct < worst.accuracyPct) {
      worst = q;
    }
  }
  if (worst && worst.accuracyPct < 50) {
    items.push({
      kind: 'class',
      questionNumber: worst.number,
      prompt: worst.prompt,
      accuracyPct: worst.accuracyPct,
      topAnswer: groupWrongAnswers(worst.wrongAnswers)[0] ?? null,
    });
  }

  const byStudent = new Map<string, { studentId: string; studentName: string; grade: number; checkedAt?: string }>();
  for (const w of works) {
    const prev = byStudent.get(w.studentId);
    if (!prev || (w.checkedAt !== undefined && prev.checkedAt !== undefined ? prev.checkedAt < w.checkedAt : true)) {
      byStudent.set(w.studentId, w);
    }
  }
  const struggling = [...byStudent.values()]
    .filter((w) => w.grade <= 2)
    .map((w) => ({ id: w.studentId, name: w.studentName }));

  if (struggling.length > 0) {
    items.push({
      kind: 'individual',
      students: struggling,
    });
  }

  return items;
}

export function diffMask(answer: string, expected: string): boolean[] {
  const answerChars = Array.from(answer);
  const expectedChars = Array.from(expected);
  const length = Math.max(answerChars.length, expectedChars.length);
  const mask: boolean[] = [];
  for (let i = 0; i < length; i += 1) {
    mask.push(answerChars[i] !== expectedChars[i]);
  }
  return mask;
}
