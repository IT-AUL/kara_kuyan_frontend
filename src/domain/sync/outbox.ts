// Outbox state machine (ADR 0004, docs/architecture/offline-sync.md). Pure: no I/O, no clock, no randomness
// except what the caller passes in, so every transition is unit-testable and every schedule is persistable.

export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type OutboxEntry = {
  submissionUuid: string;
  status: OutboxStatus;
  /** Send attempts started so far. */
  attempts: number;
  /** Epoch ms from which a `pending` entry may be sent. */
  nextAttemptAt: number;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
};

export type RetryPolicy = {
  baseMs: number;
  factor: number;
  maxMs: number;
  /** Fraction of the delay randomised in both directions, e.g. 0.2 = ±20%. */
  jitter: number;
  /** After this many attempts a retryable failure becomes `failed` and is shown to the teacher. */
  maxAttempts: number;
};

export const defaultRetryPolicy: RetryPolicy = {
  baseMs: 5_000,
  factor: 2,
  maxMs: 15 * 60_000,
  jitter: 0.2,
  maxAttempts: 8,
};

/** Delay before the next try after `attempt` attempts have failed (attempt >= 1). */
export function backoffDelayMs(attempt: number, policy: RetryPolicy, random: () => number): number {
  const raw = Math.min(policy.maxMs, policy.baseMs * policy.factor ** Math.max(0, attempt - 1));
  const spread = (random() * 2 - 1) * policy.jitter;
  return Math.max(0, Math.round(raw * (1 + spread)));
}

export function newEntry(submissionUuid: string, now: number): OutboxEntry {
  return { submissionUuid, status: 'pending', attempts: 0, nextAttemptAt: now, lastError: null, createdAt: now, updatedAt: now };
}

export function isDue(entry: OutboxEntry, now: number): boolean {
  return entry.status === 'pending' && entry.nextAttemptAt <= now;
}

function expect(entry: OutboxEntry, status: OutboxStatus, action: string): void {
  if (entry.status !== status) {
    throw new Error(`Cannot ${action}: entry ${entry.submissionUuid} is ${entry.status}, expected ${status}`);
  }
}

export function startSync(entry: OutboxEntry, now: number): OutboxEntry {
  expect(entry, 'pending', 'start sync');
  return { ...entry, status: 'syncing', attempts: entry.attempts + 1, updatedAt: now };
}

export function markSynced(entry: OutboxEntry, now: number): OutboxEntry {
  expect(entry, 'syncing', 'mark synced');
  return { ...entry, status: 'synced', lastError: null, updatedAt: now };
}

/** Retryable failure (network, timeout, 5xx): back to `pending` with backoff, or `failed` once attempts run out. */
export function markRetry(
  entry: OutboxEntry,
  now: number,
  error: string,
  random: () => number,
  policy: RetryPolicy = defaultRetryPolicy,
): OutboxEntry {
  expect(entry, 'syncing', 'mark retry');
  if (entry.attempts >= policy.maxAttempts) {
    return { ...entry, status: 'failed', lastError: error, updatedAt: now };
  }
  return {
    ...entry,
    status: 'pending',
    nextAttemptAt: now + backoffDelayMs(entry.attempts, policy, random),
    lastError: error,
    updatedAt: now,
  };
}

/** Permanent rejection (e.g. HTTP 4xx): not retried automatically, surfaced to the teacher. */
export function markRejected(entry: OutboxEntry, now: number, error: string): OutboxEntry {
  expect(entry, 'syncing', 'mark rejected');
  return { ...entry, status: 'failed', lastError: error, updatedAt: now };
}

/** Manual retry of a failed entry. */
export function retryNow(entry: OutboxEntry, now: number): OutboxEntry {
  expect(entry, 'failed', 'retry');
  return { ...entry, status: 'pending', attempts: 0, nextAttemptAt: now, updatedAt: now };
}

/** Start-up recovery: a `syncing` entry left by a killed process goes back to `pending`, attempts kept. */
export function recoverInterrupted(entry: OutboxEntry, now: number): OutboxEntry {
  if (entry.status !== 'syncing') return entry;
  return { ...entry, status: 'pending', nextAttemptAt: now, updatedAt: now };
}
