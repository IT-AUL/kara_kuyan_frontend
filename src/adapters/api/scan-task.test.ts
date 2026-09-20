import { parseScanTaskBody } from './backend';

const task = { task_id: 't1', prompt_tt: 'Куегыз: китап ->', expected_answer: 'КИТАПКА', cell_count: 8, grade_level: 7, topic_tag: 'case_dative', topic_name_tt: 'Юнәлеш килеше', is_public_in_bank: false };

describe('parseScanTaskBody', () => {
  it('reads all extracted sub-tasks', () => {
    const r = parseScanTaskBody(JSON.stringify({ is_supported: true, unsupported_reason: null, task, tasks: [task, { ...task, task_id: 't2' }], raw_ocr_text: 'текст', confidence: 0.95 }));
    expect(r.supported).toBe(true);
    expect(r.tasks.map((t) => t.taskId)).toEqual(['t1', 't2']);
    expect(r.tasks[0]).toMatchObject({ prompt: 'Куегыз: китап ->', expectedAnswer: 'КИТАПКА', cellCount: 8, topicTag: 'case_dative' });
    expect(r.confidence).toBe(0.95);
  });

  it('falls back to the primary task and reports unsupported exercises', () => {
    expect(parseScanTaskBody(JSON.stringify({ is_supported: true, task, tasks: [] })).tasks).toHaveLength(1);
    const no = parseScanTaskBody(JSON.stringify({ is_supported: false, unsupported_reason: 'нужно больше 12 клеток', task: null, tasks: [] }));
    expect(no).toMatchObject({ supported: false, unsupportedReason: 'нужно больше 12 клеток', tasks: [] });
  });

  it('rejects a malformed body', () => {
    expect(() => parseScanTaskBody('{"tasks":[{"prompt_tt":1}]}')).toThrow();
  });
});
