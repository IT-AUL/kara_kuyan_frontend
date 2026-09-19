import { MemoryStore } from '@/adapters/memory/memory-store';
import { FakeGateway } from '@/adapters/sync/fake-gateway';
import type { SubmissionPayload } from '@/domain/sync/payload';
import { defaultRetryPolicy } from '@/domain/sync/outbox';
import type { StoredSubmission } from '@/ports/submission-store';
import { SyncEngine } from './syncEngine';

const payload = (uuid: string): SubmissionPayload => ({
  client_submission_uuid: uuid, student_id: 's', student_name: 'n', variant: 1, checked_at: '2026-09-19T00:00:00Z',
  overall_score: 1, max_score: 1, final_grade: 5, teacher_reviewed_flags: 0, questions_results: [],
});
const sub = (uuid: string, at = 0): StoredSubmission => ({ uuid, assignmentId: 'A', classId: 'C', payload: payload(uuid), savedAt: at });

function setup(policy = { ...defaultRetryPolicy, jitter: 0 }) {
  const clock = { t: 1_000, now() { return this.t; } };
  const store = new MemoryStore();
  const gateway = new FakeGateway();
  const make = () => new SyncEngine({ store, gateway, clock, random: () => 0.5, policy });
  return { clock, store, gateway, engine: make(), make };
}

describe('SyncEngine', () => {
  it('sends a saved sheet once and marks it synced', async () => {
    const { engine, store, gateway } = setup();
    await engine.enqueue(sub('u1'));
    expect(await engine.runOnce()).toEqual({ sent: 1, retried: 0, rejected: 0 });
    expect(await store.counts()).toMatchObject({ synced: 1, pending: 0 });
    expect(gateway.records.size).toBe(1);
    expect(await engine.runOnce()).toEqual({ sent: 0, retried: 0, rejected: 0 });
    expect(gateway.calls).toBe(1);
  });

  it('backs off while offline and delivers when the network returns', async () => {
    const { engine, store, gateway, clock } = setup();
    gateway.mode = 'offline';
    await engine.enqueue(sub('u1'));
    expect((await engine.runOnce()).retried).toBe(1);
    const [row] = await store.list();
    expect(row.entry).toMatchObject({ status: 'pending', attempts: 1, nextAttemptAt: 1_000 + 5_000 });
    gateway.mode = 'online';
    expect(await engine.runOnce()).toEqual({ sent: 0, retried: 0, rejected: 0 }); // not due yet
    clock.t += 5_000;
    expect((await engine.runOnce()).sent).toBe(1);
    expect(await store.nextWakeAt()).toBeNull();
  });

  it('surfaces a permanent rejection and only retries it on request', async () => {
    const { engine, store, gateway } = setup();
    gateway.mode = 'reject';
    await engine.enqueue(sub('u1'));
    expect((await engine.runOnce()).rejected).toBe(1);
    expect(await store.counts()).toMatchObject({ failed: 1 });
    expect((await engine.runOnce()).sent).toBe(0);
    gateway.mode = 'online';
    expect(await engine.retryFailed()).toBe(1);
    expect((await engine.runOnce()).sent).toBe(1);
  });

  it('gives up after the attempt limit', async () => {
    const { engine, store, gateway, clock } = setup({ ...defaultRetryPolicy, jitter: 0, maxAttempts: 3 });
    gateway.mode = 'offline';
    await engine.enqueue(sub('u1'));
    for (let i = 0; i < 5; i += 1) { await engine.runOnce(); clock.t += 60_000; }
    expect(await store.counts()).toMatchObject({ failed: 1, pending: 0 });
    expect(gateway.calls).toBe(3);
  });

  it('recovers an entry left syncing by a killed process and does not duplicate on resend', async () => {
    const { engine, store, gateway, make } = setup();
    await engine.enqueue(sub('u1'));
    gateway.mode = 'lost-response'; // the request reached the server, the response never came back
    await engine.runOnce();
    const [row] = await store.list();
    await store.updateEntry({ ...row.entry, status: 'syncing' }); // as if the process died mid-send
    const restarted = make();
    expect(await restarted.recover()).toBe(1);
    gateway.mode = 'online';
    expect((await restarted.runOnce()).sent).toBe(1);
    expect(gateway.records.size).toBe(1);
    expect(gateway.inserted).toBe(1);
    expect(gateway.updated).toBe(1); // second delivery updated the same server record
  });

  it('delivers a 25-sheet offline batch without loss or duplicates', async () => {
    const { engine, store, gateway, clock } = setup();
    gateway.mode = 'offline';
    for (let i = 0; i < 25; i += 1) await engine.enqueue(sub(`u${i}`, i));
    await engine.runOnce();
    expect(await store.counts()).toMatchObject({ pending: 25 });
    gateway.mode = 'online';
    clock.t += 10_000;
    expect((await engine.runOnce()).sent).toBe(25);
    expect(await store.counts()).toMatchObject({ synced: 25, pending: 0, failed: 0 });
    expect(gateway.records.size).toBe(25);
    expect(gateway.inserted).toBe(25);
    expect(gateway.updated).toBe(0);
  });

  it('never runs two syncs at once', async () => {
    const { engine, gateway } = setup();
    gateway.delayMs = 20;
    await engine.enqueue(sub('u1'));
    const [a, b] = await Promise.all([engine.runOnce(), engine.runOnce()]);
    expect(a.sent + b.sent).toBe(1);
    expect(gateway.calls).toBe(1);
  });

  it('turns a thrown gateway error into a retry', async () => {
    const { store, gateway, make } = setup();
    gateway.send = async () => { throw new Error('boom'); };
    const engine = make();
    await engine.enqueue(sub('u1'));
    expect((await engine.runOnce()).retried).toBe(1);
    expect((await store.list())[0].entry.lastError).toContain('boom');
  });
});
