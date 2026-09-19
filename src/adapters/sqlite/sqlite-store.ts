import { and, asc, eq, lte, min, sql } from 'drizzle-orm';

import type { OutboxEntry, OutboxStatus } from '@/domain/sync/outbox';
import type { StoredSubmission, StoredWithOutbox, SubmissionStore } from '@/ports/submission-store';
import type { Db } from './db';
import { outbox, submissions } from './schema';

type Row = { s: typeof submissions.$inferSelect; o: typeof outbox.$inferSelect };

function toDomain({ s, o }: Row): StoredWithOutbox {
  const entry: OutboxEntry = {
    submissionUuid: o.submissionUuid, status: o.status, attempts: o.attempts, nextAttemptAt: o.nextAttemptAt,
    lastError: o.lastError, createdAt: o.createdAt, updatedAt: o.updatedAt,
  };
  const submission: StoredSubmission = {
    uuid: s.uuid, assignmentId: s.assignmentId, classId: s.classId,
    payload: JSON.parse(s.payloadJson), savedAt: s.savedAt,
  };
  return { submission, entry };
}

/** Durable store on expo-sqlite + Drizzle (ADR 0004). */
export class SqliteStore implements SubmissionStore {
  constructor(private readonly db: Db) {}

  async saveWithOutbox(submission: StoredSubmission, entry: OutboxEntry): Promise<void> {
    // Drizzle's expo-sqlite transaction is synchronous: BEGIN … COMMIT, ROLLBACK if anything throws.
    this.db.transaction((tx) => {
      tx.insert(submissions).values({
        uuid: submission.uuid, assignmentId: submission.assignmentId, classId: submission.classId,
        payloadJson: JSON.stringify(submission.payload), savedAt: submission.savedAt,
      }).run();
      tx.insert(outbox).values({
        submissionUuid: entry.submissionUuid, status: entry.status, attempts: entry.attempts,
        nextAttemptAt: entry.nextAttemptAt, lastError: entry.lastError, createdAt: entry.createdAt, updatedAt: entry.updatedAt,
      }).run();
    });
  }

  private joined() {
    return this.db.select({ s: submissions, o: outbox }).from(submissions).innerJoin(outbox, eq(outbox.submissionUuid, submissions.uuid));
  }

  async list() {
    return this.joined().orderBy(asc(submissions.savedAt)).all().map(toDomain);
  }

  async listDue(now: number, limit: number) {
    return this.joined()
      .where(and(eq(outbox.status, 'pending'), lte(outbox.nextAttemptAt, now)))
      .orderBy(asc(outbox.nextAttemptAt), asc(submissions.savedAt))
      .limit(limit).all().map(toDomain);
  }

  async listFailed() {
    return this.joined().where(eq(outbox.status, 'failed')).orderBy(asc(submissions.savedAt)).all().map(toDomain);
  }

  async updateEntry(entry: OutboxEntry): Promise<void> {
    this.db.update(outbox).set({
      status: entry.status, attempts: entry.attempts, nextAttemptAt: entry.nextAttemptAt,
      lastError: entry.lastError, updatedAt: entry.updatedAt,
    }).where(eq(outbox.submissionUuid, entry.submissionUuid)).run();
  }

  async recoverInterrupted(now: number): Promise<number> {
    const res = this.db.update(outbox).set({ status: 'pending', nextAttemptAt: now, updatedAt: now })
      .where(eq(outbox.status, 'syncing')).run();
    return res.changes;
  }

  async counts() {
    const rows = this.db.select({ status: outbox.status, n: sql<number>`count(*)` }).from(outbox).groupBy(outbox.status).all();
    const out: Record<OutboxStatus, number> = { pending: 0, syncing: 0, synced: 0, failed: 0 };
    for (const r of rows) out[r.status] = Number(r.n);
    return out;
  }

  /** Dev/test only: raw row counts of both tables (an orphan submission would show here). */
  debugCounts(): { submissions: number; outbox: number } {
    const a = this.db.select({ n: sql<number>`count(*)` }).from(submissions).get();
    const b = this.db.select({ n: sql<number>`count(*)` }).from(outbox).get();
    return { submissions: Number(a?.n ?? 0), outbox: Number(b?.n ?? 0) };
  }

  /** Dev/test only: removes every stored submission and outbox row. */
  clearAll(): void {
    this.db.transaction((tx) => {
      tx.delete(outbox).run();
      tx.delete(submissions).run();
    });
  }

  async nextWakeAt() {
    const row = this.db.select({ t: min(outbox.nextAttemptAt) }).from(outbox).where(eq(outbox.status, 'pending')).get();
    return row?.t ?? null;
  }
}
