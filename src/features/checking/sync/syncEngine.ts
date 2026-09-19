import {
  defaultRetryPolicy, markRejected, markRetry, markSynced, newEntry, retryNow, startSync, type RetryPolicy,
} from '@/domain/sync/outbox';
import type { Clock, SyncGateway } from '@/ports/sync-gateway';
import type { StoredSubmission, SubmissionStore } from '@/ports/submission-store';

export type SyncSummary = { sent: number; retried: number; rejected: number };

type Deps = {
  store: SubmissionStore;
  gateway: SyncGateway;
  clock: Clock;
  random?: () => number;
  policy?: RetryPolicy;
  batchLimit?: number;
};

/**
 * Sends stored submissions one request each and records every outcome durably. All schedule state lives
 * in the store (`nextAttemptAt`), never only in memory, so a killed process loses nothing.
 */
export class SyncEngine {
  private running = false;
  private readonly listeners = new Set<() => void>();
  private readonly random: () => number;
  private readonly policy: RetryPolicy;
  private readonly batchLimit: number;

  constructor(private readonly deps: Deps) {
    this.random = deps.random ?? Math.random;
    this.policy = deps.policy ?? defaultRetryPolicy;
    this.batchLimit = deps.batchLimit ?? 50;
  }

  /** Notified after every durable change (enqueue, each transition, manual retry, recovery). */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  /** Call once at start-up: entries left in `syncing` by a killed process go back to `pending`. */
  async recover(): Promise<number> {
    const n = await this.deps.store.recoverInterrupted(this.deps.clock.now());
    this.emit();
    return n;
  }

  /** Atomically stores the result and its outbox row. */
  async enqueue(submission: StoredSubmission): Promise<void> {
    await this.deps.store.saveWithOutbox(submission, newEntry(submission.uuid, this.deps.clock.now()));
    this.emit();
  }

  /** Sends everything that is due. A second call while one is running does nothing. */
  async runOnce(): Promise<SyncSummary> {
    const summary: SyncSummary = { sent: 0, retried: 0, rejected: 0 };
    if (this.running) return summary;
    this.running = true;
    try {
      const { store, gateway, clock } = this.deps;
      for (const { submission, entry } of await store.listDue(clock.now(), this.batchLimit)) {
        const syncing = startSync(entry, clock.now());
        await store.updateEntry(syncing); // persisted BEFORE sending, so a kill leaves a recoverable `syncing`
        this.emit();
        let result;
        try {
          result = await gateway.send({
            assignmentId: submission.assignmentId,
            classId: submission.classId,
            syncedAt: new Date(clock.now()).toISOString(),
            submission: submission.payload,
          });
        } catch (e) {
          result = { kind: 'retry' as const, error: String(e) };
        }
        const now = clock.now();
        if (result.kind === 'ok') { await store.updateEntry(markSynced(syncing, now)); summary.sent += 1; }
        else if (result.kind === 'retry') { await store.updateEntry(markRetry(syncing, now, result.error, this.random, this.policy)); summary.retried += 1; }
        else { await store.updateEntry(markRejected(syncing, now, result.error)); summary.rejected += 1; }
        this.emit();
      }
      return summary;
    } finally {
      this.running = false;
    }
  }

  /** Manual retry of everything that ended in `failed`. */
  async retryFailed(): Promise<number> {
    const { store, clock } = this.deps;
    const failed = await store.listFailed();
    for (const { entry } of failed) await store.updateEntry(retryNow(entry, clock.now()));
    this.emit();
    return failed.length;
  }

  nextWakeAt(): Promise<number | null> {
    return this.deps.store.nextWakeAt();
  }
}
