// Pure rules of the test constructor: what a draft test is, how tasks are added/ordered, what a custom task must satisfy.
// No React, no network.

export type DraftTask = {
  taskId: string;
  prompt: string;
  expectedAnswer: string;
  cellCount: number;
  gradeLevel: number;
  topicTag: string;
  topicName: string;
};

export type TestDraft = {
  title: string;
  gradeLevel: number;
  variants: number;
  tasks: readonly DraftTask[];
};

/** Rows that fit one printed A4 sheet in the backend's template (question block pitch 28 mm). */
export const SHEET_CAPACITY = 8;
export const MAX_CELLS = 12;

export const emptyDraft: TestDraft = { title: '', gradeLevel: 7, variants: 1, tasks: [] };

/** Appends tasks that are not in the draft yet, keeping the existing order. */
export function addTasks(draft: TestDraft, tasks: readonly DraftTask[]): TestDraft {
  const known = new Set(draft.tasks.map((t) => t.taskId));
  const fresh = tasks.filter((t, i) => !known.has(t.taskId) && tasks.findIndex((x) => x.taskId === t.taskId) === i);
  return fresh.length === 0 ? draft : { ...draft, tasks: [...draft.tasks, ...fresh] };
}

export function removeTask(draft: TestDraft, taskId: string): TestDraft {
  return { ...draft, tasks: draft.tasks.filter((t) => t.taskId !== taskId) };
}

/** Moves a task one step up (-1) or down (+1); out-of-range moves leave the draft unchanged. */
export function moveTask(draft: TestDraft, taskId: string, step: -1 | 1): TestDraft {
  const from = draft.tasks.findIndex((t) => t.taskId === taskId);
  const to = from + step;
  if (from < 0 || to < 0 || to >= draft.tasks.length) return draft;
  const tasks = [...draft.tasks];
  [tasks[from], tasks[to]] = [tasks[to], tasks[from]];
  return { ...draft, tasks };
}

export type DraftStats = { taskCount: number; cellCount: number; fitsOneSheet: boolean };

export function draftStats(draft: TestDraft): DraftStats {
  return {
    taskCount: draft.tasks.length,
    cellCount: draft.tasks.reduce((sum, t) => sum + t.cellCount, 0),
    fitsOneSheet: draft.tasks.length <= SHEET_CAPACITY,
  };
}

export type DraftIssue = 'title-too-short' | 'too-many-tasks';

/** Blocking problems only; an empty task list is allowed (the server then picks the tasks itself). */
export function draftIssues(draft: TestDraft): DraftIssue[] {
  const issues: DraftIssue[] = [];
  if (draft.title.trim().length < 3) issues.push('title-too-short');
  if (draft.tasks.length > 20) issues.push('too-many-tasks');
  return issues;
}

/** Cells to print for an answer: one per letter, capped by the sheet's 12-cell row. */
export function defaultCells(answer: string): number {
  return Math.min(MAX_CELLS, Math.max(1, [...answer].length));
}

export type CustomTaskInput = { prompt: string; answer: string; cellCount: number };
export type CustomTaskIssue = 'prompt-too-short' | 'answer-empty' | 'answer-too-long' | 'answer-letters' | 'cells-too-few' | 'cells-too-many';

/**
 * Checks a teacher-written task. `alphabet` is the recogniser's alphabet from the backend manifest; when it is
 * not available yet (offline first run) letters are not checked. The answer is compared upper-cased.
 */
export function validateCustomTask(input: CustomTaskInput, alphabet: readonly string[] | null): CustomTaskIssue[] {
  const issues: CustomTaskIssue[] = [];
  const answer = input.answer.trim().toUpperCase();
  const letters = [...answer];
  if (input.prompt.trim().length < 3) issues.push('prompt-too-short');
  if (letters.length === 0) issues.push('answer-empty');
  if (letters.length > MAX_CELLS) issues.push('answer-too-long');
  if (alphabet && letters.some((ch) => !alphabet.includes(ch))) issues.push('answer-letters');
  if (input.cellCount < letters.length) issues.push('cells-too-few');
  if (input.cellCount > MAX_CELLS) issues.push('cells-too-many');
  return issues;
}

export const customTaskIssueText: Record<CustomTaskIssue, string> = {
  'prompt-too-short': 'Напишите вопрос (не короче 3 символов).',
  'answer-empty': 'Введите правильный ответ.',
  'answer-too-long': `Ответ длиннее ${MAX_CELLS} букв: в строке бланка не больше ${MAX_CELLS} клеток.`,
  'answer-letters': 'В ответе есть символы, которых нет в алфавите распознавания (только буквы, без пробелов и цифр).',
  'cells-too-few': 'Клеток меньше, чем букв в ответе.',
  'cells-too-many': `Клеток не больше ${MAX_CELLS}.`,
};

export function uniqueTopics(tasks: readonly Pick<DraftTask, 'topicTag' | 'topicName'>[]): { tag: string; name: string; count: number }[] {
  const map = new Map<string, { tag: string; name: string; count: number }>();
  for (const t of tasks) {
    const entry = map.get(t.topicTag) ?? { tag: t.topicTag, name: t.topicName, count: 0 };
    entry.count += 1;
    map.set(t.topicTag, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
