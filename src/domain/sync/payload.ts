import type { Student } from '../assessment/model';
import type { EvaluatedTask, Override, SheetOutcome } from '../scan/evaluate';
import { effectiveStatus, scoreOutcome } from '../scan/evaluate';

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
 * Expected-empty cell: blank → EMPTY_MATCH, anything else → MISMATCH. Expected letter: equal → MATCH,
 * blank → EMPTY_MISMATCH, another letter → MISMATCH.
 */
export function cellStatus(expected: string, predicted: string): CellPayload['status'] {
  if (expected === ' ') return predicted === ' ' ? 'EMPTY_MATCH' : 'MISMATCH';
  if (predicted === expected) return 'MATCH';
  return predicted === ' ' ? 'EMPTY_MISMATCH' : 'MISMATCH';
}

/**
 * The teacher decides per answer; the backend records overrides per cell. An accepted answer marks its
 * non-matching cells CORRECT, a rejected one marks them WRONG (the first cell when none stands out).
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
      return { ...base, status: 'FLAG_OVERRIDDEN_BY_TEACHER', teacher_override: override === 'accept' ? 'CORRECT' : 'WRONG' };
    }
    return { ...base, status: cellStatus(c.expected, c.predicted) };
  });
}

export type BuildSubmissionInput = {
  uuid: string;
  outcome: SheetOutcome;
  overrides: Readonly<Record<number, Override>>;
  student: Pick<Student, 'id' | 'name'>;
  checkedAt: Date;
  grade: number;
};

export function buildSubmission({ uuid, outcome, overrides, student, checkedAt, grade }: BuildSubmissionInput): SubmissionPayload {
  const { score, maxScore } = scoreOutcome(outcome, overrides);
  return {
    client_submission_uuid: uuid,
    student_id: student.id,
    student_name: student.name,
    variant: outcome.variant,
    checked_at: checkedAt.toISOString(),
    overall_score: score,
    max_score: maxScore,
    final_grade: grade,
    teacher_reviewed_flags: Object.keys(overrides).length,
    questions_results: outcome.tasks.map<QuestionResultPayload>((task) => ({
      question_number: task.number,
      marker_id: task.markerId,
      topic_tag: task.topicTag,
      is_correct: effectiveStatus(task, overrides[task.number]) === 'correct',
      points_earned: effectiveStatus(task, overrides[task.number]) === 'correct' ? 1 : 0,
      cells: cellPayloads(task, overrides[task.number]),
    })),
  };
}
