import { useSyncExternalStore } from 'react';

import { kvStore } from '@/composition';
import { addTasks, emptyDraft, moveTask, removeTask, type DraftTask, type TestDraft } from '@/domain/constructor/draft';

const KEY = 'test-draft';
const listeners = new Set<() => void>();

function load(): TestDraft {
  try {
    const raw = kvStore.get(KEY);
    if (raw) return { ...emptyDraft, ...(JSON.parse(raw) as Partial<TestDraft>) };
  } catch {
    // corrupted draft → start empty
  }
  return emptyDraft;
}

let draft: TestDraft = load();

function commit(next: TestDraft) {
  draft = next;
  try {
    kvStore.set(KEY, JSON.stringify(next));
  } catch {
    // keep the draft in memory
  }
  listeners.forEach((l) => l());
}

/** The test being built. Survives leaving the screen and restarting the app, so a half-made test is never lost. */
export const testDraft = {
  get: () => draft,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setMeta(meta: Partial<Pick<TestDraft, 'title' | 'gradeLevel' | 'variants'>>) {
    commit({ ...draft, ...meta });
  },
  addTasks(tasks: readonly DraftTask[]) {
    commit(addTasks(draft, tasks));
  },
  removeTask(taskId: string) {
    commit(removeTask(draft, taskId));
  },
  moveTask(taskId: string, step: -1 | 1) {
    commit(moveTask(draft, taskId, step));
  },
  clear() {
    commit(emptyDraft);
  },
};

export const useTestDraft = (): TestDraft => useSyncExternalStore(testDraft.subscribe, testDraft.get, testDraft.get);
