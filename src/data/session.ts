import { useSyncExternalStore } from 'react';

import type { TeacherSession } from '@/adapters/api/backend';
import { backendApi, kvStore } from '@/composition';

import { classesResource } from './hub';

export type Profile = TeacherSession & { school: string };

type State = {
  ready: boolean;
  profile: Profile | null;
  activeClassId: string | null;
  activeAssignmentId: string | null;
};

const KEY = 'session';
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = kvStore.get(KEY);
    if (raw) return { ready: true, ...(JSON.parse(raw) as Omit<State, 'ready'>) };
  } catch {
    // corrupted entry → start signed out
  }
  return { ready: true, profile: null, activeClassId: null, activeAssignmentId: null };
}

let state: State = load();

function commit(next: Partial<State>) {
  state = { ...state, ...next };
  try {
    const { ready: _ready, ...persisted } = state;
    kvStore.set(KEY, JSON.stringify(persisted));
  } catch {
    // keep going in memory
  }
  listeners.forEach((l) => l());
}

export const session = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** First run: registers the device with the backend and stores the teacher's profile. */
  async signIn(name: string, school: string): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!backendApi) return { ok: false, message: 'Сервер отключён в этой сборке.' };
    const result = await backendApi.handshake(name.trim(), school.trim());
    if (!result.ok) return { ok: false, message: 'Не удалось связаться с сервером. Проверьте интернет и повторите.' };
    commit({ profile: { ...result.value, school: school.trim() } });
    return { ok: true };
  },

  selectClass(classId: string | null) {
    commit({ activeClassId: classId });
  },

  selectAssignment(assignmentId: string | null) {
    commit({ activeAssignmentId: assignmentId });
  },

  /** Picks the first class when none is chosen yet or the chosen one disappeared. */
  ensureSelection() {
    const classes = classesResource.getState().data ?? [];
    if (classes.length === 0) return;
    if (!state.activeClassId || !classes.some((c) => c.classId === state.activeClassId)) {
      commit({ activeClassId: classes[0].classId });
    }
  },
};

export function useSession(): State {
  return useSyncExternalStore(session.subscribe, session.getState, session.getState);
}
