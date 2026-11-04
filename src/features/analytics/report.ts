import {
  averageGrade,
  type LessonPlanItem,
  qualityPct,
  sou,
  successPct,
} from '@/domain/analytics/stats';

export type ReportInput = {
  title: string;
  className: string;
  teacherName: string;
  date: Date;
  rosterCount: number;
  wroteCount: number;
  grades: { '5': number; '4': number; '3': number; '2': number };
  questions: {
    number: number;
    prompt: string;
    accuracyPct: number;
    correctCount: number;
  }[];
  plan: string[];
};

export function formatReportDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}.${month}.${year}`;
}

export function formatLessonPlan(items: readonly LessonPlanItem[]): string[] {
  return items.map((item) => {
    if (item.kind === 'class') {
      return `Повторить со всем классом задание ${item.questionNumber} (верно ${Math.round(item.accuracyPct)}%)`;
    }
    return `Консультация: ${item.students.map((s) => s.name).join(', ')}`;
  });
}

export function buildReportText(r: ReportInput): string {
  const title = r.title.trim() || '—';
  const className = r.className.trim() || '—';
  const teacherName = r.teacherName.trim() || '—';
  const dateStr = formatReportDate(r.date);
  const absentCount = Math.max(0, r.rosterCount - r.wroteCount);

  const totalGrades =
    r.grades['5'] + r.grades['4'] + r.grades['3'] + r.grades['2'];
  const denom = totalGrades > 0 ? totalGrades : r.wroteCount;
  const gradeEntry = (grade: '5' | '4' | '3' | '2') => {
    const count = r.grades[grade];
    const pct = denom > 0 ? Math.round((count / denom) * 100) : 0;
    return `«${grade}» — ${count} (${pct}%)`;
  };

  const q = qualityPct(r.grades);
  const s = successPct(r.grades);
  const souVal = sou(r.grades);
  const avg = averageGrade(r.grades);

  const questionLines =
    r.questions.length > 0
      ? r.questions.map(
          (item) =>
            `${item.number}. ${item.prompt} — справились ${item.correctCount} из ${r.wroteCount} (${Math.round(item.accuracyPct)}%)`,
        )
      : ['—'];

  const planLines =
    r.plan.length > 0
      ? r.plan.map((item, idx) => `${idx + 1}. ${item}`)
      : ['—'];

  return [
    `Анализ контрольной работы «${title}»`,
    `${className} · ${teacherName} · ${dateStr}`,
    `По списку: ${r.rosterCount}, писали: ${r.wroteCount}, отсутствовали: ${absentCount}`,
    '',
    `${gradeEntry('5')}, ${gradeEntry('4')}, ${gradeEntry('3')}, ${gradeEntry('2')}`,
    `Качество знаний: ${q !== null ? `${Math.round(q)}%` : '—'}`,
    `Успеваемость: ${s !== null ? `${Math.round(s)}%` : '—'}`,
    `СОУ: ${souVal !== null ? `${Math.round(souVal)}%` : '—'}`,
    `Средний балл: ${avg !== null ? avg.toFixed(1).replace('.', ',') : '—'}`,
    '',
    'Поэлементный анализ',
    ...questionLines,
    '',
    'План коррекции',
    ...planLines,
  ].join('\n');
}
