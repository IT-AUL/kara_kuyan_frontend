import { useSyncExternalStore } from 'react';

/** Tasks the teacher ticked in the bank for the next test (kept in memory, not persisted). */
let selected: readonly string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const testDraft = {
  get: () => selected,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  toggle(taskId: string) {
    selected = selected.includes(taskId) ? selected.filter((id) => id !== taskId) : [...selected, taskId];
    emit();
  },
  clear() {
    selected = [];
    emit();
  },
};

export const useTestDraft = () => useSyncExternalStore(testDraft.subscribe, testDraft.get, testDraft.get);
