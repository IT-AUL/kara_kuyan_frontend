import { buildReportText, formatLessonPlan } from './report';

describe('buildReportText', () => {
  it('formats report text with zavuch metrics for 25 students (5/10/7/3)', () => {
    const text = buildReportText({
      title: 'Килешләр',
      className: '7-А',
      teacherName: 'Гөлнара Ильдаровна',
      date: new Date(2026, 10, 3),
      rosterCount: 27,
      wroteCount: 25,
      grades: { '5': 5, '4': 10, '3': 7, '2': 3 },
      questions: [
        {
          number: 1,
          prompt: 'Лексика',
          accuracyPct: 92,
          correctCount: 23,
        },
        {
          number: 4,
          prompt: 'Юнәлеш килеше',
          accuracyPct: 38.4,
          correctCount: 10,
        },
      ],
      plan: [
        'Повторить со всем классом задание 4 (верно 38%)',
        'Консультация: Каримов Булат, Сафина Амина',
      ],
    });

    expect(text).toContain('Анализ контрольной работы «Килешләр»');
    expect(text).toContain('7-А · Гөлнара Ильдаровна · 03.11.2026');
    expect(text).toContain('По списку: 27, писали: 25, отсутствовали: 2');
    expect(text).toContain('«5» — 5 (20%), «4» — 10 (40%), «3» — 7 (28%), «2» — 3 (12%)');
    expect(text).toContain('Качество знаний: 60%');
    expect(text).toContain('Успеваемость: 88%');
    expect(text).toContain('СОУ: 58%');
    expect(text).toContain('Средний балл: 3,7');
    expect(text).toContain('1. Лексика — справились 23 из 25 (92%)');
    expect(text).toContain('4. Юнәлеш килеше — справились 10 из 25 (38%)');
    expect(text).toContain('1. Повторить со всем классом задание 4 (верно 38%)');
    expect(text).toContain('2. Консультация: Каримов Булат, Сафина Амина');
  });

  it('outputs em-dash for null metrics when no one wrote the test', () => {
    const text = buildReportText({
      title: 'Тартым',
      className: '8-Б',
      teacherName: 'Айгуль Рашитовна',
      date: new Date(2026, 9, 24),
      rosterCount: 20,
      wroteCount: 0,
      grades: { '5': 0, '4': 0, '3': 0, '2': 0 },
      questions: [],
      plan: [],
    });

    expect(text).toContain('Качество знаний: —');
    expect(text).toContain('Успеваемость: —');
    expect(text).toContain('СОУ: —');
    expect(text).toContain('Средний балл: —');
  });

  it('formats lessonPlan items into plain strings', () => {
    const lines = formatLessonPlan([
      {
        kind: 'class',
        questionNumber: 4,
        prompt: 'Юнәлеш килеше',
        accuracyPct: 37.6,
        topAnswer: null,
      },
      {
        kind: 'individual',
        students: [
          { id: '1', name: 'Булат К.' },
          { id: '2', name: 'Амина С.' },
        ],
      },
    ]);

    expect(lines).toEqual([
      'Повторить со всем классом задание 4 (верно 38%)',
      'Консультация: Булат К., Амина С.',
    ]);
  });
});
