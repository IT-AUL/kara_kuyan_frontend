import { useSyncExternalStore } from 'react';

import { kvStore } from '@/composition';

const KEY = 'hidden-tests';
const listeners = new Set<() => void>();

function load(): readonly string[] {
  try {
    const raw = kvStore.get(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

let hidden: readonly string[] = load();

function commit(next: readonly string[]) {
  hidden = next;
  kvStore.set(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

/**
 * Tests the teacher hid from the list on this phone. The backend has no delete endpoint and its list is shared
 * by everybody, so hiding is the only way to keep the list clean; nothing is deleted on the server.
 */
export const hiddenTests = {
  get: () => hidden,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  hide: (id: string) => commit(hidden.includes(id) ? hidden : [...hidden, id]),
  unhide: (id: string) => commit(hidden.filter((x) => x !== id)),
};

export const useHiddenTests = (): readonly string[] => useSyncExternalStore(hiddenTests.subscribe, hiddenTests.get, hiddenTests.get);
