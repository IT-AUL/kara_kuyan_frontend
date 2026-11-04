import {
  averageGrade,
  diffMask,
  failPct,
  type GradeCounts,
  groupWrongAnswers,
  lessonPlan,
  qualityPct,
  sou,
  successPct,
  zoneOf,
} from './stats';

describe('analytics domain stats', () => {
  it('computes zavuch metrics for the reference distribution (5/10/7/3 of 25)', () => {
    const counts: GradeCounts = { '5': 5, '4': 10, '3': 7, '2': 3 };
    expect(qualityPct(counts)).toBe(60);
    expect(successPct(counts)).toBe(88);
    expect(failPct(counts)).toBe(12);
    expect(sou(counts)).toBe(58);
    expect(averageGrade(counts)).toBe(3.7);
  });

  it('returns null for all metrics when grade counts are empty', () => {
    const empty: GradeCounts = { '5': 0, '4': 0, '3': 0, '2': 0 };
    expect(qualityPct(empty)).toBeNull();
    expect(successPct(empty)).toBeNull();
    expect(failPct(empty)).toBeNull();
    expect(sou(empty)).toBeNull();
    expect(averageGrade(empty)).toBeNull();
  });

  it('classifies accuracy percentages into zones at 50 and 80 thresholds', () => {
    expect(zoneOf(49.9)).toBe('bad');
    expect(zoneOf(50)).toBe('mid');
    expect(zoneOf(79.9)).toBe('mid');
    expect(zoneOf(80)).toBe('ok');
  });

  it('groups wrong answers case-insensitively with trim, handles empty answers, and sorts by count then locale', () => {
    const grouped = groupWrongAnswers([
      { studentId: 's1', studentName: 'Алия', writtenAnswer: ' Мәктәпка ' },
      { studentId: 's2', studentName: 'Тимур', writtenAnswer: 'мәктәпка' },
      { studentId: 's3', studentName: 'Азат', writtenAnswer: '   ' },
      { studentId: 's4', studentName: 'Дина', writtenAnswer: 'мектәпкә' },
      { studentId: 's5', studentName: 'Булат', writtenAnswer: 'мәктәпгә' },
    ]);

    expect(grouped).toEqual([
      {
        answer: 'мәктәпка',
        count: 2,
        students: [
          { id: 's1', name: 'Алия' },
          { id: 's2', name: 'Тимур' },
        ],
      },
      {
        answer: '',
        count: 1,
        students: [{ id: 's3', name: 'Азат' }],
      },
      {
        answer: 'мәктәпгә',
        count: 1,
        students: [{ id: 's5', name: 'Булат' }],
      },
      {
        answer: 'мектәпкә',
        count: 1,
        students: [{ id: 's4', name: 'Дина' }],
      },
    ]);
  });

  it('builds lessonPlan with class and individual items when thresholds are met', () => {
    const questions = [
      {
        number: 1,
        prompt: 'Перевод: книга',
        accuracyPct: 75,
        wrongAnswers: [{ studentId: 's1', studentName: 'Алия', writtenAnswer: 'кетап' }],
      },
      {
        number: 4,
        prompt: 'Юнәлеш килеше: мәктәп',
        accuracyPct: 38,
        wrongAnswers: [
          { studentId: 's2', studentName: 'Булат', writtenAnswer: 'мәктәпка' },
          { studentId: 's3', studentName: 'Амина', writtenAnswer: 'Мәктәпка ' },
          { studentId: 's4', studentName: 'Тимур', writtenAnswer: 'мәктәпгә' },
        ],
      },
    ];
    const works = [
      { studentId: 's1', studentName: 'Алия', grade: 4 },
      { studentId: 's2', studentName: 'Булат', grade: 2 },
      { studentId: 's3', studentName: 'Амина', grade: 2 },
    ];

    expect(lessonPlan(questions, works)).toEqual([
      {
        kind: 'class',
        questionNumber: 4,
        prompt: 'Юнәлеш килеше: мәктәп',
        accuracyPct: 38,
        topAnswer: {
          answer: 'мәктәпка',
          count: 2,
          students: [
            { id: 's2', name: 'Булат' },
            { id: 's3', name: 'Амина' },
          ],
        },
      },
      {
        kind: 'individual',
        students: [
          { id: 's2', name: 'Булат' },
          { id: 's3', name: 'Амина' },
        ],
      },
    ]);
  });

  it('omits class item when all questions have accuracy >= 50 and keeps individual item for grade <= 2', () => {
    const questions = [
      { number: 1, prompt: 'Задание 1', accuracyPct: 50, wrongAnswers: [] },
      { number: 2, prompt: 'Задание 2', accuracyPct: 85, wrongAnswers: [] },
    ];
    const works = [
      { studentId: 's1', studentName: 'Алия', grade: 5 },
      { studentId: 's2', studentName: 'Булат', grade: 2 },
    ];

    expect(lessonPlan(questions, works)).toEqual([
      {
        kind: 'individual',
        students: [{ id: 's2', name: 'Булат' }],
      },
    ]);
  });

  it('computes character diffMask for Tatar strings and different lengths', () => {
    expect(diffMask('мәктәпка', 'мәктәпкә')).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(diffMask('кита', 'китап')).toEqual([false, false, false, false, true]);
  });
});
