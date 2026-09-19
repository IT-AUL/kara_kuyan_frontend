import { useSyncExternalStore } from 'react';

import type { OutboxStatus } from '@/domain/sync/outbox';
import { submissionStore, syncEngine } from '@/composition';
import type { StoredWithOutbox } from '@/ports/submission-store';

export type SyncState = {
  rows: readonly StoredWithOutbox[];
  counts: Readonly<Record<OutboxStatus, number>>;
};

let state: SyncState = { rows: [], counts: { pending: 0, syncing: 0, synced: 0, failed: 0 } };
const listeners = new Set<() => void>();

async function refresh(): Promise<void> {
  const [rows, counts] = await Promise.all([submissionStore.list(), submissionStore.counts()]);
  state = { rows, counts };
  listeners.forEach((l) => l());
}

let wired = false;
function wire(): void {
  if (wired) return;
  wired = true;
  syncEngine.onChange(() => void refresh());
  void refresh();
}

/** Saved sheets and outbox counters, read from the durable store and refreshed on every change. */
export function useSyncState(): SyncState {
  wire();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => state,
    () => state,
  );
}

export const retryFailedSheets = () => syncEngine.retryFailed();
