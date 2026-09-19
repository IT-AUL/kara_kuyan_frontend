import {
  addTasks, defaultCells, draftIssues, draftStats, emptyDraft, moveTask, removeTask, uniqueTopics, validateCustomTask,
  type DraftTask,
} from './draft';

const task = (id: string, cells = 8, topic = 't1'): DraftTask => ({
  taskId: id, prompt: `p ${id}`, expectedAnswer: 'КИТАП', cellCount: cells, gradeLevel: 7, topicTag: topic, topicName: `Тема ${topic}`,
});

describe('draft', () => {
  it('adds new tasks in order and ignores duplicates', () => {
    const d = addTasks(addTasks(emptyDraft, [task('a'), task('b'), task('a')]), [task('b'), task('c')]);
    expect(d.tasks.map((t) => t.taskId)).toEqual(['a', 'b', 'c']);
  });

  it('removes and moves tasks, ignoring out-of-range moves', () => {
    const d = addTasks(emptyDraft, [task('a'), task('b'), task('c')]);
    expect(moveTask(d, 'a', -1)).toBe(d);
    expect(moveTask(d, 'c', 1)).toBe(d);
    expect(moveTask(d, 'b', -1).tasks.map((t) => t.taskId)).toEqual(['b', 'a', 'c']);
    expect(removeTask(d, 'b').tasks.map((t) => t.taskId)).toEqual(['a', 'c']);
  });

  it('counts tasks and cells and knows the sheet capacity', () => {
    const many = addTasks(emptyDraft, Array.from({ length: 9 }, (_, i) => task(`t${i}`, 6)));
    expect(draftStats(many)).toEqual({ taskCount: 9, cellCount: 54, fitsOneSheet: false });
    expect(draftStats(emptyDraft).fitsOneSheet).toBe(true);
  });

  it('blocks only a short title (an empty task list is fine: the server picks)', () => {
    expect(draftIssues({ ...emptyDraft, title: 'КР' })).toEqual(['title-too-short']);
    expect(draftIssues({ ...emptyDraft, title: 'Кр5' })).toEqual([]);
  });

  it('lists topics by frequency', () => {
    expect(uniqueTopics([task('a', 8, 'x'), task('b', 8, 'y'), task('c', 8, 'y')]).map((t) => [t.tag, t.count])).toEqual([['y', 2], ['x', 1]]);
  });
});

describe('validateCustomTask', () => {
  const alphabet = [...'АӘБВГДЕЖЗИКЛМНОӨПРСТУҮ'];
  it('accepts a good task and upper-cases the answer', () => {
    expect(validateCustomTask({ prompt: 'Куегыз: китап', answer: 'китап', cellCount: 6 }, alphabet)).toEqual([]);
  });
  it('reports each problem', () => {
    expect(validateCustomTask({ prompt: 'a', answer: '', cellCount: 1 }, alphabet)).toEqual(['prompt-too-short', 'answer-empty']);
    expect(validateCustomTask({ prompt: 'вопрос', answer: 'АААААААААААААА', cellCount: 14 }, alphabet)).toEqual(['answer-too-long', 'cells-too-many']);
    expect(validateCustomTask({ prompt: 'вопрос', answer: 'КИТ АП', cellCount: 6 }, alphabet)).toContain('answer-letters');
    expect(validateCustomTask({ prompt: 'вопрос', answer: 'КИТАП', cellCount: 3 }, alphabet)).toEqual(['cells-too-few']);
  });
  it('skips the letter check when the alphabet is unknown', () => {
    expect(validateCustomTask({ prompt: 'вопрос', answer: 'QWE', cellCount: 3 }, null)).toEqual([]);
  });
  it('defaults cells to the answer length within 1..12', () => {
    expect(defaultCells('КИТАП')).toBe(5);
    expect(defaultCells('')).toBe(1);
    expect(defaultCells('А'.repeat(20))).toBe(12);
  });
});
