import type { OfflineBundle } from '@/domain/scan/bundle';

import { ApiClient, type ApiResult } from './client';
import { arr, num, obj, str } from './guards';

export type GradingScale = { grade5MinPct: number; grade4MinPct: number; grade3MinPct: number };
export type TeacherSession = { teacherUuid: string; teacherName: string; gradingScale: GradingScale; confidenceFlagThreshold: number };
export type ClassSummary = { classId: string; name: string; studentCount: number };
export type RosterStudent = { studentId: string; fullName: string };
export type ClassRoster = { classId: string; className: string; students: RosterStudent[] };
export type TaskBankEntry = { taskId: string; prompt: string; expectedAnswer: string; cellCount: number; gradeLevel: number; topicTag: string; topicName: string };

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

function parseTasks(json: unknown): TaskBankEntry[] {
  return arr(json, 'tasks').map((raw) => {
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
}
