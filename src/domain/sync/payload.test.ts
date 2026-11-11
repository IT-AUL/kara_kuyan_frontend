import { cellFixKey, type CellFixes, type SheetOutcome } from '../scan/evaluate';
import { buildSubmission, cellStatus } from './payload';

const cell = (index: number, expected: string, predicted: string, verdict: 'match' | 'mismatch' | 'uncertain' | 'blank') => ({
  index, expected, predicted, confidence: 0.9, verdict,
});

const outcome: SheetOutcome = {
  check: { ok: true }, assignmentId: 'T1', variant: 2, qrRecognised: true, studentNameText: '',
  tasks: [
    { number: 1, markerId: 11, prompt: 'p', topicTag: 'case_dative', expected: 'КА', recognized: 'КА', status: 'correct',
      cells: [cell(0, 'К', 'К', 'match'), cell(1, 'А', 'А', 'match'), cell(2, ' ', ' ', 'match')] },
    { number: 2, markerId: 12, prompt: 'p', topicTag: 'case_ablative', expected: 'ДА', recognized: 'ТА', status: 'error',
      cells: [cell(0, 'Д', 'Т', 'mismatch'), cell(1, 'А', 'А', 'match'), cell(2, ' ', ' ', 'match')] },
    { number: 3, markerId: 13, prompt: 'p', topicTag: 'plural', expected: 'ДУС', recognized: 'ДУ', status: 'review',
      cells: [cell(0, 'Д', 'Д', 'match'), cell(1, 'У', 'У', 'uncertain'), cell(2, 'С', ' ', 'blank')] },
    { number: 4, markerId: 14, prompt: 'p4', topicTag: 'vowel_harmony', expected: 'КӨЗ', recognized: 'КОЗ', status: 'review',
      cells: [cell(0, 'К', 'К', 'match'), { index: 1, expected: 'Ө', predicted: 'О', confidence: 0.62, verdict: 'uncertain' }, cell(2, 'З', 'З', 'match')] },
  ],
};
const student = { id: '7a-014', name: 'Галиев Амир Р.' };
const build = (overrides: Record<number, 'accept' | 'reject'>, cellFixes?: CellFixes) =>
  buildSubmission({ uuid: 'uuid-1', outcome, overrides, cellFixes, student, checkedAt: new Date('2026-09-19T12:00:00Z'), grade: 4 });

describe('cellStatus (mirrors the backend checker)', () => {
  it('follows the server rules', () => {
    expect(cellStatus('К', 'К')).toBe('MATCH');
    expect(cellStatus('К', ' ')).toBe('EMPTY_MISMATCH');
    expect(cellStatus('Д', 'Т')).toBe('MISMATCH');
    expect(cellStatus(' ', ' ')).toBe('EMPTY_MATCH');
    expect(cellStatus(' ', 'Н')).toBe('MISMATCH');
  });
});

describe('buildSubmission', () => {
  it('builds the documented shape with score, statuses and no overrides', () => {
    const p = build({});
    expect(p).toMatchObject({
      client_submission_uuid: 'uuid-1', student_id: '7a-014', variant: 2, checked_at: '2026-09-19T12:00:00.000Z',
      overall_score: 1, max_score: 4, final_grade: 4, teacher_reviewed_flags: 0,
    });
    expect(p.questions_results.map((q) => [q.question_number, q.is_correct, q.points_earned, q.topic_tag])).toEqual([
      [1, true, 1, 'case_dative'],
      [2, false, 0, 'case_ablative'],
      [3, false, 0, 'plural'],
      [4, false, 0, 'vowel_harmony'],
    ]);
    expect(p.questions_results[1].cells.map((c) => c.status)).toEqual(['MISMATCH', 'MATCH', 'EMPTY_MATCH']);
    expect(p.questions_results[2].cells.map((c) => c.status)).toEqual(['MATCH', 'MATCH', 'EMPTY_MISMATCH']);
  });

  it('records a teacher decision per cell and counts it in the score', () => {
    const accepted = build({ 3: 'accept' });
    expect(accepted.overall_score).toBe(2);
    expect(accepted.teacher_reviewed_flags).toBe(1);
    const q3 = accepted.questions_results[2];
    expect(q3.is_correct).toBe(true);
    expect(q3.cells.filter((c) => c.status === 'FLAG_OVERRIDDEN_BY_TEACHER').map((c) => [c.cell_index, c.teacher_override])).toEqual([[2, 'CORRECT']]);

    const rejected = build({ 3: 'reject' });
    expect(rejected.overall_score).toBe(1);
    expect(rejected.questions_results[2].cells[2]).toMatchObject({ status: 'FLAG_OVERRIDDEN_BY_TEACHER', teacher_override: 'WRONG' });
  });

  it('propagates 1-tap Top-3 cell fixes into predicted_char, score, and FLAG_OVERRIDDEN_BY_TEACHER', () => {
    const fixedCorrect = build({}, { [cellFixKey(4, 1)]: 'Ө' });
    expect(fixedCorrect.overall_score).toBe(2);
    expect(fixedCorrect.teacher_reviewed_flags).toBe(1);
    expect(fixedCorrect.questions_results[3]).toMatchObject({ is_correct: true, points_earned: 1 });
    expect(fixedCorrect.questions_results[3].cells[1]).toEqual({
      cell_index: 1,
      expected_char: 'Ө',
      predicted_char: 'Ө',
      confidence: 1,
      status: 'FLAG_OVERRIDDEN_BY_TEACHER',
      teacher_override: 'CORRECT',
    });

    const fixedWrong = build({}, { [cellFixKey(4, 1)]: 'О' });
    expect(fixedWrong.overall_score).toBe(1);
    expect(fixedWrong.teacher_reviewed_flags).toBe(1);
    expect(fixedWrong.questions_results[3]).toMatchObject({ is_correct: false, points_earned: 0 });
    expect(fixedWrong.questions_results[3].cells[1]).toEqual({
      cell_index: 1,
      expected_char: 'Ө',
      predicted_char: 'О',
      confidence: 1,
      status: 'FLAG_OVERRIDDEN_BY_TEACHER',
      teacher_override: 'WRONG',
    });
  });

  it('contains only text and numbers (no image data)', () => {
    const json = JSON.stringify(build({ 3: 'accept' }, { [cellFixKey(4, 1)]: 'Ө' }));
    expect(json.length).toBeLessThan(3500);
    expect(json).not.toMatch(/base64|data:image/i);
  });
});
