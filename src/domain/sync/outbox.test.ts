import {
  backoffDelayMs, defaultRetryPolicy, isDue, markRejected, markRetry, markSynced, newEntry, recoverInterrupted,
  retryNow, startSync,
} from './outbox';

const fixed = (v: number) => () => v;

describe('outbox state machine', () => {
  it('moves pending → syncing → synced and counts attempts', () => {
    const e = newEntry('u1', 1000);
    expect(isDue(e, 999)).toBe(false);
    expect(isDue(e, 1000)).toBe(true);
    const syncing = startSync(e, 1000);
    expect(syncing).toMatchObject({ status: 'syncing', attempts: 1 });
    expect(isDue(syncing, 5000)).toBe(false);
    expect(markSynced(syncing, 1100)).toMatchObject({ status: 'synced', lastError: null });
  });

  it('retries with exponential, capped, jittered backoff and gives up after the attempt limit', () => {
    const policy = { ...defaultRetryPolicy, maxAttempts: 3, jitter: 0 };
    let e = startSync(newEntry('u1', 0), 0);
    e = markRetry(e, 0, 'offline', fixed(0.5), policy);
    expect(e).toMatchObject({ status: 'pending', attempts: 1, nextAttemptAt: 5000, lastError: 'offline' });
    e = markRetry(startSync(e, 5000), 5000, 'offline', fixed(0.5), policy);
    expect(e.nextAttemptAt).toBe(5000 + 10_000);
    e = markRetry(startSync(e, 15_000), 15_000, 'offline', fixed(0.5), policy);
    expect(e).toMatchObject({ status: 'failed', attempts: 3 });
    expect(retryNow(e, 20_000)).toMatchObject({ status: 'pending', attempts: 0, nextAttemptAt: 20_000 });
  });

  it('caps the delay and keeps jitter inside ±20%', () => {
    expect(backoffDelayMs(30, { ...defaultRetryPolicy, jitter: 0 }, fixed(0.5))).toBe(defaultRetryPolicy.maxMs);
    const low = backoffDelayMs(2, defaultRetryPolicy, fixed(0));
    const high = backoffDelayMs(2, defaultRetryPolicy, fixed(1));
    expect(low).toBe(8000);
    expect(high).toBe(12_000);
  });

  it('treats a permanent rejection as failed without scheduling a retry', () => {
    const e = markRejected(startSync(newEntry('u1', 0), 0), 10, 'HTTP 422');
    expect(e).toMatchObject({ status: 'failed', lastError: 'HTTP 422' });
    expect(isDue(e, 1e9)).toBe(false);
  });

  it('recovers entries interrupted while syncing and leaves the others alone', () => {
    const syncing = startSync(newEntry('u1', 0), 0);
    expect(recoverInterrupted(syncing, 50)).toMatchObject({ status: 'pending', attempts: 1, nextAttemptAt: 50 });
    const synced = markSynced(syncing, 10);
    expect(recoverInterrupted(synced, 50)).toBe(synced);
  });

  it('rejects impossible transitions', () => {
    const e = newEntry('u1', 0);
    expect(() => markSynced(e, 1)).toThrow();
    expect(() => markRetry(e, 1, 'x', fixed(0))).toThrow();
    expect(() => retryNow(e, 1)).toThrow();
    expect(() => startSync(startSync(e, 1), 2)).toThrow();
  });
});
