// Dev-only helpers for verifying the outbox on the device (reachable from `karakuyan://ocr-lab`).
import { fakeGateway, newUuid, submissionStore, syncEngine, syncScheduler } from '@/composition';
import { newEntry } from '@/domain/sync/outbox';
import type { SubmissionPayload } from '@/domain/sync/payload';

function syntheticPayload(uuid: string, n: number): SubmissionPayload {
  return {
    client_submission_uuid: uuid, student_id: `lab-${n}`, student_name: `Лаборатория ${n}`, variant: 1,
    checked_at: new Date().toISOString(), overall_score: 7, max_score: 8, final_grade: 5, teacher_reviewed_flags: 0,
    questions_results: Array.from({ length: 8 }, (_, q) => ({
      question_number: q + 1, marker_id: 11 + q, topic_tag: 'lab', is_correct: true, points_earned: 1,
      cells: Array.from({ length: 9 }, (_, c) => ({
        cell_index: c, expected_char: c < 8 ? 'А' : ' ', predicted_char: c < 8 ? 'А' : ' ', confidence: 0.99,
        status: (c < 8 ? 'MATCH' : 'EMPTY_MATCH') as 'MATCH' | 'EMPTY_MATCH',
      })),
    })),
  };
}

export async function outboxStatus() {
  const rows = await submissionStore.list();
  return {
    counts: await submissionStore.counts(),
    nextWakeAt: await syncEngine.nextWakeAt(),
    now: Date.now(),
    fakeServer: fakeGateway
      ? { mode: fakeGateway.mode, delayMs: fakeGateway.delayMs, calls: fakeGateway.calls, records: fakeGateway.records.size, inserted: fakeGateway.inserted, updated: fakeGateway.updated }
      : 'real gateway',
    firstRows: rows.slice(0, 3).map((r) => ({ uuid: r.submission.uuid.slice(0, 8), ...r.entry })),
    payloadBytes: rows[0] ? JSON.stringify(rows[0].submission.payload).length : 0,
  };
}

/** 25 sheets saved while the (fake) server is unreachable. */
export async function offlineBatch(count = 25) {
  if (!fakeGateway) throw new Error('fake gateway only');
  fakeGateway.mode = 'offline';
  fakeGateway.delayMs = 0;
  for (let i = 0; i < count; i += 1) {
    const uuid = newUuid();
    await syncEngine.enqueue({ uuid, assignmentId: 'LAB', classId: 'cls_lab', savedAt: Date.now() + i, payload: syntheticPayload(uuid, i) });
  }
  await syncScheduler.trigger();
  return outboxStatus();
}

/** Network back: keep running the engine until nothing is pending (backoff makes the first retry wait ~5 s). */
export async function goOnlineAndDrain(maxSeconds = 90) {
  if (!fakeGateway) throw new Error('fake gateway only');
  fakeGateway.mode = 'online';
  const started = Date.now();
  while (Date.now() - started < maxSeconds * 1000) {
    await syncEngine.runOnce();
    const c = await submissionStore.counts();
    if (c.pending + c.syncing === 0) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { ...(await outboxStatus()), waitedMs: Date.now() - started };
}

/** Starts one slow send (30 s) and returns while it is `syncing`, so the process can be killed mid-send. */
export async function slowSend() {
  if (!fakeGateway) throw new Error('fake gateway only');
  fakeGateway.mode = 'online';
  fakeGateway.delayMs = 30_000;
  const uuid = newUuid();
  await syncEngine.enqueue({ uuid, assignmentId: 'LAB', classId: 'cls_lab', savedAt: Date.now(), payload: syntheticPayload(uuid, 999) });
  void syncScheduler.trigger();
  await new Promise((r) => setTimeout(r, 500));
  return outboxStatus();
}

export async function clearAll() {
  submissionStore.clearAll();
  if (fakeGateway) { fakeGateway.records.clear(); fakeGateway.calls = 0; fakeGateway.inserted = 0; fakeGateway.updated = 0; fakeGateway.mode = 'online'; fakeGateway.delayMs = 0; }
  await syncEngine.recover();
  return outboxStatus();
}

/** AC1: the outbox insert is made to fail (foreign key) — the submission insert before it must roll back. */
export async function atomicityCheck() {
  const before = submissionStore.debugCounts();
  const uuid = newUuid();
  let error: string | null = null;
  try {
    await submissionStore.saveWithOutbox(
      { uuid, assignmentId: 'LAB', classId: 'cls_lab', savedAt: Date.now(), payload: syntheticPayload(uuid, 0) },
      newEntry('no-such-submission', Date.now()),
    );
  } catch (e) {
    error = String(e);
  }
  const after = submissionStore.debugCounts();
  return { before, after, failedAsExpected: error !== null, rolledBack: before.submissions === after.submissions && before.outbox === after.outbox, error };
}
