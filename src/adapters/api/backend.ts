import type { OfflineBundle } from '@/domain/scan/bundle';

import { ApiClient, type ApiResult } from './client';
import { arr, num, obj, str } from './guards';

export type GradingScale = { grade5MinPct: number; grade4MinPct: number; grade3MinPct: number };
export type TeacherSession = { teacherUuid: string; teacherName: string; gradingScale: GradingScale; confidenceFlagThreshold: number };
export type ClassSummary = { classId: string; name: string; studentCount: number };
export type RosterStudent = { studentId: string; fullName: string };
export type ClassRoster = { classId: string; className: string; students: RosterStudent[] };
export type TaskBankEntry = { taskId: string; prompt: string; expectedAnswer: string; cellCount: number; gradeLevel: number; topicTag: string; topicName: string };

export type TestSummary = { testId: string; title: string; gradeLevel: number; questionsCount: number };
export type TopicStat = { topicCode: string; topicName: string; failureRatePct: number; affectedStudents: number };
export type ClassAnalytics = {
  classId: string;
  className: string;
  studentsCount: number;
  averageScorePct: number;
  gradeDistribution: Record<string, number>;
  topMistakes: TopicStat[];
  difficultLetters: { letter: string; errorRatePct: number }[];
};
export type QuestionStat = { number: number; prompt: string; expectedAnswer: string; accuracyPct: number; wrongCount: number };
export type AssignmentAnalytics = { assignmentId: string; title: string; totalSubmissions: number; averageScorePct: number; questions: QuestionStat[] };
export type SubmissionRow = {
  uuid: string;
  studentId: string;
  studentName: string;
  variant: number;
  checkedAt: string;
  score: number;
  maxScore: number;
  grade: number;
  reviewedFlags: number;
  /** Per-task result, when the server sent `questions_results` (absent in caches made before this field). */
  tasks?: { number: number; correct: boolean }[];
};

export type TaskType = { taskType: string; topicTag: string; topicName: string };
export type ModelManifest = { modelVersion: string; sha256: string; alphabet: string[] };

function parseTaskTypes(json: unknown): TaskType[] {
  return arr(obj(json, 'task types').task_types, 'task_types').map((raw) => {
    const t = obj(raw, 'task type');
    return { taskType: str(t.task_type, 'task_type'), topicTag: str(t.topic_tag, 'topic_tag'), topicName: str(t.topic_name_tt, 'topic_name_tt') };
  });
}

function parseManifest(json: unknown): ModelManifest {
  const m = obj(json, 'manifest');
  return {
    modelVersion: str(m.model_version, 'model_version'),
    sha256: str(m.sha256, 'sha256'),
    alphabet: arr(m.alphabet_classes, 'alphabet_classes').map((c) => str(c, 'class')),
  };
}

export function parseBundle(json: unknown): OfflineBundle {
  const b = obj(json, 'bundle');
  return {
    assignmentId: str(b.assignment_id, 'assignment_id'),
    title: str(b.title, 'title'),
    variants: arr(b.variants, 'variants').map((raw) => {
      const v = obj(raw, 'variant');
      return {
        variantId: num(v.variant_id, 'variant_id'),
        questions: arr(v.questions, 'questions').map((rawQ) => {
          const q = obj(rawQ, 'question');
          return {
            questionNumber: num(q.question_number, 'question_number'),
            markerId: num(q.marker_id, 'marker_id'),
            prompt: str(q.prompt, 'prompt'),
            topicTag: str(q.topic_tag, 'topic_tag'),
            topicName: typeof q.topic_name_tt === 'string' ? q.topic_name_tt : undefined,
            expectedAnswer: str(q.expected_answer, 'expected_answer'),
            expectedCells: arr(q.expected_cells, 'expected_cells').map((rawC) => {
              const c = obj(rawC, 'cell');
              return { index: num(c.index, 'index'), char: str(c.char, 'char') };
            }),
          };
        }),
      };
    }),
  };
}

function parseSession(json: unknown): TeacherSession {
  const r = obj(json, 'handshake');
  const prefs = obj(r.preferences, 'preferences');
  const scale = prefs.grading_scale === undefined ? {} : obj(prefs.grading_scale, 'grading_scale');
  return {
    teacherUuid: str(r.teacher_uuid, 'teacher_uuid'),
    teacherName: str(r.teacher_name, 'teacher_name'),
    gradingScale: {
      grade5MinPct: typeof scale.grade_5_min_pct === 'number' ? scale.grade_5_min_pct : 85,
      grade4MinPct: typeof scale.grade_4_min_pct === 'number' ? scale.grade_4_min_pct : 70,
      grade3MinPct: typeof scale.grade_3_min_pct === 'number' ? scale.grade_3_min_pct : 50,
    },
    confidenceFlagThreshold: typeof prefs.confidence_flag_threshold === 'number' ? prefs.confidence_flag_threshold : 0.65,
  };
}

function parseClasses(json: unknown): ClassSummary[] {
  return arr(obj(json, 'classes').classes, 'classes').map((raw) => {
    const c = obj(raw, 'class');
    return { classId: str(c.class_id, 'class_id'), name: str(c.name, 'name'), studentCount: num(c.student_count, 'student_count') };
  });
}

function parseRoster(json: unknown): ClassRoster {
  const r = obj(json, 'roster');
  return {
    classId: str(r.class_id, 'class_id'),
    className: str(r.class_name, 'class_name'),
    students: arr(r.students, 'students').map((raw) => {
      const s = obj(raw, 'student');
      return { studentId: str(s.student_id, 'student_id'), fullName: str(s.full_name, 'full_name') };
    }),
  };
}

function parseTask(raw: unknown): TaskBankEntry {
  const t = obj(raw, 'task');
  return {
    taskId: str(t.task_id, 'task_id'),
    prompt: str(t.prompt_tt, 'prompt_tt'),
    expectedAnswer: str(t.expected_answer, 'expected_answer'),
    cellCount: num(t.cell_count, 'cell_count'),
    gradeLevel: num(t.grade_level, 'grade_level'),
    topicTag: str(t.topic_tag, 'topic_tag'),
    topicName: str(t.topic_name_tt, 'topic_name_tt'),
  };
}

const parseTasks = (json: unknown): TaskBankEntry[] => arr(json, 'tasks').map(parseTask);

function parseTests(json: unknown): TestSummary[] {
  return arr(json, 'tests').map((raw) => {
    const t = obj(raw, 'test');
    return { testId: str(t.test_id, 'test_id'), title: str(t.title, 'title'), gradeLevel: num(t.grade_level, 'grade_level'), questionsCount: num(t.questions_count, 'questions_count') };
  });
}

function parseClassAnalytics(json: unknown): ClassAnalytics {
  const r = obj(json, 'class analytics');
  const dist = r.grade_distribution === undefined ? {} : obj(r.grade_distribution, 'grade_distribution');
  return {
    classId: str(r.class_id, 'class_id'),
    className: str(r.class_name, 'class_name'),
    studentsCount: num(r.students_count, 'students_count'),
    averageScorePct: num(r.average_class_score_pct, 'average_class_score_pct'),
    gradeDistribution: Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, num(v, 'grade count')])),
    topMistakes: arr(r.top_class_mistakes ?? [], 'top_class_mistakes').map((raw) => {
      const m = obj(raw, 'mistake');
      return { topicCode: str(m.topic_code, 'topic_code'), topicName: str(m.topic_name_tt, 'topic_name_tt'), failureRatePct: num(m.failure_rate_pct, 'failure_rate_pct'), affectedStudents: num(m.affected_students_count, 'affected_students_count') };
    }),
    difficultLetters: arr(r.difficult_characters_across_class ?? [], 'difficult_characters').map((raw) => {
      const c = obj(raw, 'char');
      return { letter: str(c.letter, 'letter'), errorRatePct: num(c.error_rate_pct, 'error_rate_pct') };
    }),
  };
}

function parseAssignmentAnalytics(json: unknown): AssignmentAnalytics {
  const r = obj(json, 'assignment analytics');
  return {
    assignmentId: str(r.assignment_id, 'assignment_id'),
    title: str(r.title, 'title'),
    totalSubmissions: num(r.total_submissions, 'total_submissions'),
    averageScorePct: num(r.average_score_pct, 'average_score_pct'),
    questions: arr(r.questions_analytics ?? [], 'questions_analytics').map((raw) => {
      const q = obj(raw, 'question');
      return { number: num(q.question_number, 'question_number'), prompt: str(q.prompt, 'prompt'), expectedAnswer: str(q.expected_answer, 'expected_answer'), accuracyPct: num(q.accuracy_pct, 'accuracy_pct'), wrongCount: arr(q.wrong_submissions ?? [], 'wrong_submissions').length };
    }),
  };
}

function parseSubmissions(json: unknown): SubmissionRow[] {
  return arr(json, 'submissions').map((raw) => {
    const s = obj(raw, 'submission');
    return {
      uuid: str(s.client_submission_uuid, 'client_submission_uuid'),
      studentId: str(s.student_id, 'student_id'),
      studentName: str(s.student_name, 'student_name'),
      variant: num(s.variant, 'variant'),
      checkedAt: str(s.checked_at, 'checked_at'),
      score: num(s.overall_score, 'overall_score'),
      maxScore: num(s.max_score, 'max_score'),
      grade: num(s.final_grade, 'final_grade'),
      reviewedFlags: typeof s.teacher_reviewed_flags === 'number' ? s.teacher_reviewed_flags : 0,
      tasks: Array.isArray(s.questions_results)
        ? s.questions_results.flatMap((raw) => {
            const q = raw as Record<string, unknown>;
            return typeof q.question_number === 'number' && typeof q.is_correct === 'boolean' ? [{ number: q.question_number, correct: q.is_correct }] : [];
          })
        : undefined,
    };
  });
}

/**
 * Typed access to the backend endpoints the app uses. Server-side OCR endpoints (`/ocr/*`,
 * `/constructor/scan-task*`) are deliberately absent: no pixels leave the phone (ADR 0003).
 */
export class BackendApi {
  constructor(private readonly client: ApiClient) {}

  handshake(teacherName: string, schoolName: string): Promise<ApiResult<TeacherSession>> {
    return this.client.request('/api/v1/auth/device-handshake', parseSession, {
      method: 'POST',
      body: { device_os: 'android', teacher_name: teacherName, school_name: schoolName },
    });
  }

  /** The constructor's answer is a full offline bundle, so a new assignment needs no second call. */
  assembleTest(input: { title: string; gradeLevel: number; variants: number; taskIds?: readonly string[] }): Promise<ApiResult<OfflineBundle>> {
    return this.client.request('/api/v1/constructor/tests', parseBundle, {
      method: 'POST',
      body: {
        title: input.title,
        grade_level: input.gradeLevel,
        generate_variants_count: input.variants,
        ...(input.taskIds ? { task_items: input.taskIds.map((task_id, order) => ({ task_id, order: order + 1 })) } : {}),
      },
    });
  }

  fetchBundle(assignmentId: string): Promise<ApiResult<OfflineBundle>> {
    return this.client.request(`/api/v1/assignments/${encodeURIComponent(assignmentId)}/offline-bundle`, parseBundle);
  }

  listClasses(): Promise<ApiResult<ClassSummary[]>> {
    return this.client.request('/api/v1/classes', parseClasses);
  }

  classRoster(classId: string): Promise<ApiResult<ClassRoster>> {
    return this.client.request(`/api/v1/classes/${encodeURIComponent(classId)}/students`, parseRoster);
  }

  /** Creates the class implicitly when the id is new (observed on the live server). One name per line. */
  importStudents(classId: string, names: readonly string[]): Promise<ApiResult<RosterStudent[]>> {
    return this.client.request(
      `/api/v1/classes/${encodeURIComponent(classId)}/students/bulk-import`,
      (json) =>
        arr(obj(json, 'import').students, 'students').map((raw) => {
          const s = obj(raw, 'student');
          return { studentId: str(s.student_id, 'student_id'), fullName: str(s.full_name, 'full_name') };
        }),
      { method: 'POST', body: { raw_text: names.join('\n') } },
    );
  }

  searchTasks(query: { gradeLevel?: number; topicTag?: string; query?: string }): Promise<ApiResult<TaskBankEntry[]>> {
    return this.client.request('/api/v1/constructor/tasks', parseTasks, {
      query: { grade_level: query.gradeLevel, topic_tag: query.topicTag, query: query.query },
    });
  }

  /** Server-wide list of assembled tests (the live server does not scope it to the teacher). */
  listTests(): Promise<ApiResult<TestSummary[]>> {
    return this.client.request('/api/v1/constructor/ready-tests', parseTests);
  }

  classAnalytics(classId: string): Promise<ApiResult<ClassAnalytics>> {
    return this.client.request(`/api/v1/analytics/classes/${encodeURIComponent(classId)}`, parseClassAnalytics);
  }

  assignmentAnalytics(assignmentId: string): Promise<ApiResult<AssignmentAnalytics>> {
    return this.client.request(`/api/v1/analytics/assignments/${encodeURIComponent(assignmentId)}`, parseAssignmentAnalytics);
  }

  listSubmissions(filter: { classId?: string; assignmentId?: string; studentId?: string }): Promise<ApiResult<SubmissionRow[]>> {
    return this.client.request('/api/v1/submissions', parseSubmissions, {
      query: { class_id: filter.classId, assignment_id: filter.assignmentId, student_id: filter.studentId },
    });
  }

  blankPdfTarget(assignmentId: string, variant: number) {
    return this.client.downloadTarget(`/api/v1/assignments/${encodeURIComponent(assignmentId)}/blank.pdf`, { variant });
  }

  gradebookTarget(assignmentId: string, classId: string, format: 'xlsx' | 'csv') {
    return this.client.downloadTarget(`/api/v1/reports/assignments/${encodeURIComponent(assignmentId)}/gradebook.xlsx`, { class_id: classId, format });
  }

  taskTypes(): Promise<ApiResult<TaskType[]>> {
    return this.client.request('/api/v1/constructor/task-types', parseTaskTypes);
  }

  /** Deterministic generator on the server; `saveToBank` makes the tasks addressable by id in a test. */
  generateTasks(input: { taskType: string; count: number; gradeLevel: number; customStems?: readonly string[]; seed?: number }): Promise<ApiResult<TaskBankEntry[]>> {
    return this.client.request(
      '/api/v1/constructor/generate',
      (json) => arr(obj(json, 'generate').tasks, 'tasks').map(parseTask),
      {
        method: 'POST',
        body: {
          task_type: input.taskType,
          count: input.count,
          grade_level: input.gradeLevel,
          save_to_bank: true,
          ...(input.customStems && input.customStems.length > 0 ? { custom_stems: input.customStems } : {}),
          ...(input.seed === undefined ? {} : { seed: input.seed }),
        },
      },
    );
  }

  createTask(input: { prompt: string; answer: string; cellCount: number; gradeLevel: number; topicTag: string; topicName: string }): Promise<ApiResult<TaskBankEntry>> {
    return this.client.request('/api/v1/constructor/tasks', parseTask, {
      method: 'POST',
      body: {
        prompt_tt: input.prompt,
        expected_answer: input.answer,
        cell_count: input.cellCount,
        grade_level: input.gradeLevel,
        topic_tag: input.topicTag,
        topic_name_tt: input.topicName,
        is_public_in_bank: false,
        task_type: 'custom',
      },
    });
  }

  /** Public, no auth needed: model version, hash and the recogniser's alphabet. */
  modelManifest(): Promise<ApiResult<ModelManifest>> {
    return this.client.request('/api/v1/model/manifest', parseManifest);
  }
}
