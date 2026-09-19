import {
  demoGradeForPercent,
  scorePercent,
  summarizeAssessmentProgress,
} from '@/domain/assessment/grading';
import type { Assessment, SheetResult, Student, Teacher } from '@/domain/assessment/model';

export const demoTeacher: Teacher = {
  id: 'teacher-demo-001',
  name: 'Каримова Гөлнара Илдар кызы',
  school: 'Гимназия №2 им. Ш. Марджани',
};

export const demoStudent: Student = {
  id: '7a-014',
  name: 'Галиев Амир Р.',
  code: '7A-014',
  variant: 2,
};

export const demoAssessment: Assessment = {
  id: 'assessment-control-3',
  title: 'Контрольная работа №3',
  topic: 'Исем килешләре һәм кушымчалар',
  className: '7-А · Татар теле',
  studentCount: 25,
  checkedCount: 18,
  reviewCount: 4,
  taskCount: 8,
  variantCount: 2,
};

export const demoProgress = summarizeAssessmentProgress(demoAssessment);

export const demoSheet: SheetResult = {
  student: demoStudent,
  score: 7,
  maxScore: 8,
  tasks: [
    {
      id: 'task-1',
      number: 1,
      prompt: 'Килешне билгелә',
      expected: 'КИТАПТА',
      recognized: 'КИТАПТА',
      status: 'correct',
      confidence: 0.98,
    },
    {
      id: 'task-2',
      number: 2,
      prompt: 'Җөмләне тулыландыр',
      expected: 'МАКТӘПКӘ',
      recognized: 'МАКТӘПКӘ',
      status: 'correct',
      confidence: 0.94,
    },
    {
      id: 'task-3',
      number: 3,
      prompt: 'Чыгыш килешендә языгыз',
      expected: 'ӨСТӘЛДӘН',
      recognized: 'ӨСТӘЛТӘН',
      status: 'review',
      confidence: 0.76,
    },
    {
      id: 'task-4',
      number: 4,
      prompt: 'Кушымчаны сайлагыз',
      expected: 'ДӘРЕСЛЕК',
      recognized: 'ДӘРЕСЛЕК',
      status: 'correct',
      confidence: 0.91,
    },
    {
      id: 'task-5',
      number: 5,
      prompt: 'Исемне үзгәрт',
      expected: 'УКЫТУЧЫ',
      recognized: 'УКЫТУЧЫ',
      status: 'correct',
      confidence: 0.93,
    },
    {
      id: 'task-6',
      number: 6,
      prompt: 'Килеш ахырын языгыз',
      expected: 'ТАТАРЧА',
      recognized: 'ТАТАРЧА',
      status: 'correct',
      confidence: 0.89,
    },
    {
      id: 'task-7',
      number: 7,
      prompt: 'Дөрес вариантны сайлагыз',
      expected: 'ӨЙГӘ',
      recognized: 'ӨЙГӘ',
      status: 'correct',
      confidence: 0.96,
    },
    {
      id: 'task-8',
      number: 8,
      prompt: 'Җөмләне төзегез',
      expected: 'БАЛАЛАР',
      recognized: 'БАЛАЛАР',
      status: 'correct',
      confidence: 0.9,
    },
  ],
};

export const demoSheetPercent = scorePercent(demoSheet.score, demoSheet.maxScore);
export const demoSheetGrade = demoGradeForPercent(demoSheetPercent);
export const demoReviewTask = demoSheet.tasks.find((task) => task.status === 'review')!;

export const demoStudents: Student[] = [
  demoStudent,
  { id: '7a-003', name: 'Ахметова Ләйсән Ф.', code: '7A-003', variant: 1 },
  { id: '7a-009', name: 'Валеев Илнар Р.', code: '7A-009', variant: 2 },
  { id: '7a-017', name: 'Нигматуллина Элина М.', code: '7A-017', variant: 1 },
  { id: '7a-021', name: 'Сафин Тимур А.', code: '7A-021', variant: 2 },
];

export const demoRecentSubmissions = [
  { student: demoStudents[1], result: '8/8', status: 'correct' },
  { student: demoStudents[2], result: '6/8', status: 'review' },
  { student: demoStudents[3], result: '7/8', status: 'correct' },
  { student: demoStudent, result: '7/8', status: 'pending' },
] as const;

export const demoTopics = [
  { title: 'Чыгыш килеше', detail: '11 из 25 ошибок в окончаниях -дан / -дән / -тан / -тән', count: 11 },
  { title: 'Килеш ахырлары', detail: '5 из 25 путают твердые и мягкие формы', count: 5 },
  { title: 'Кушымчалар', detail: '3 из 25 требуют повторения', count: 3 },
] as const;

export const demoInsight = {
  title: 'Повторить чыгыш килеше',
  body: '11 из 25 учеников ошиблись в окончаниях -дан / -дән / -тан / -тән.',
  recommendation: 'Подобрать 6 коротких упражнений на различение форм.',
};
