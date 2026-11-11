import type { Student } from '../assessment/model';
import type { CellFixes, EvaluatedTask, Override, SheetOutcome } from '../scan/evaluate';
import { effectiveStatus, resolveTaskWithFixes, scoreOutcome } from '../scan/evaluate';

// Wire shape of one submission as the backend's `SubmissionItem` (docs/contracts/openapi-live-2026-09-19.json).
export type CellPayload = {
  cell_index: number;
  expected_char: string;
  predicted_char: string;
  confidence: number;
  status: 'MATCH' | 'MISMATCH' | 'EMPTY_MISMATCH' | 'EMPTY_MATCH' | 'FLAG_OVERRIDDEN_BY_TEACHER';
  teacher_override?: 'CORRECT' | 'WRONG';
};

export type QuestionResultPayload = {
  question_number: number;
  marker_id: number;
  topic_tag: string;
  is_correct: boolean;
  points_earned: number;
  cells: CellPayload[];
};

export type SubmissionPayload = {
  client_submission_uuid: string;
  student_id: string;
  student_name: string;
  variant: number;
  checked_at: string;
  overall_score: number;
  max_score: number;
  final_grade: number;
  teacher_reviewed_flags: number;
  questions_results: QuestionResultPayload[];
};

/**
 * Status the backend's own checker (generators/checker.py) would assign to a cell without an override.
 */
export function cellStatus(expected: string, predicted: string): CellPayload['status'] {
  if (expected === ' ') return predicted === ' ' ? 'EMPTY_MATCH' : 'MISMATCH';
  if (predicted === expected) return 'MATCH';
  return predicted === ' ' ? 'EMPTY_MISMATCH' : 'MISMATCH';
}

/**
 * Builds per-cell wire payloads, preserving both 1-tap teacher letter fixes (`fixedByTeacher`)
 * and whole-answer swipe overrides (`override`).
 */
function cellPayloads(task: EvaluatedTask, override: Override | undefined): CellPayload[] {
  const nonMatching = task.cells.filter((c) => {
    const status = cellStatus(c.expected, c.predicted);
    return status !== 'MATCH' && status !== 'EMPTY_MATCH';
  });
  const carrier = new Set((nonMatching.length > 0 ? nonMatching : task.cells.slice(0, 1)).map((c) => c.index));
  return task.cells.map<CellPayload>((c) => {
    const base = {
      cell_index: c.index,
      expected_char: c.expected,
      predicted_char: c.predicted,
      confidence: c.confidence,
    };
    if (override && carrier.has(c.index)) {
      return {
        ...base,
        status: 'FLAG_OVERRIDDEN_BY_TEACHER',
        teacher_override: override === 'accept' ? 'CORRECT' : 'WRONG',
      };
    }
    if (c.fixedByTeacher) {
      const natural = cellStatus(c.expected, c.predicted);
      const cellOk = natural === 'MATCH' || natural === 'EMPTY_MATCH';
      return {
        ...base,
        status: 'FLAG_OVERRIDDEN_BY_TEACHER',
        teacher_override: cellOk ? 'CORRECT' : 'WRONG',
      };
    }
    return { ...base, status: cellStatus(c.expected, c.predicted) };
  });
}

export type BuildSubmissionInput = {
  uuid: string;
  outcome: SheetOutcome;
  overrides: Readonly<Record<number, Override>>;
  cellFixes?: CellFixes;
  student: Pick<Student, 'id' | 'name'>;
  checkedAt: Date;
  grade: number;
};

export function buildSubmission({
  uuid,
  outcome,
  overrides,
  cellFixes,
  student,
  checkedAt,
  grade,
}: BuildSubmissionInput): SubmissionPayload {
  const { score, maxScore } = scoreOutcome(outcome, overrides, cellFixes);
  const reviewedTasks = new Set<number>(Object.keys(overrides).map(Number));
  if (cellFixes) {
    for (const key of Object.keys(cellFixes)) {
      const taskNum = Number(key.split(':')[0]);
      if (!Number.isNaN(taskNum)) reviewedTasks.add(taskNum);
    }
  }

  return {
    client_submission_uuid: uuid,
    student_id: student.id,
    student_name: student.name,
    variant: outcome.variant,
    checked_at: checkedAt.toISOString(),
    overall_score: score,
    max_score: maxScore,
    final_grade: grade,
    teacher_reviewed_flags: reviewedTasks.size,
    questions_results: outcome.tasks.map<QuestionResultPayload>((rawTask) => {
      const task = resolveTaskWithFixes(rawTask, cellFixes);
      const isCorrect = effectiveStatus(rawTask, overrides[rawTask.number], cellFixes) === 'correct';
      return {
        question_number: task.number,
        marker_id: task.markerId,
        topic_tag: task.topicTag,
        is_correct: isCorrect,
        points_earned: isCorrect ? 1 : 0,
        cells: cellPayloads(task, overrides[rawTask.number]),
      };
    }),
  };
}
