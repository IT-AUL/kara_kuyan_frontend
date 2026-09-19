import { isDue, type OutboxEntry, type OutboxStatus, recoverInterrupted } from '@/domain/sync/outbox';
import type { StoredSubmission, StoredWithOutbox, SubmissionStore } from '@/ports/submission-store';

/** In-memory store for tests and dev fallbacks. NOT durable. */
export class MemoryStore implements SubmissionStore {
  private submissions = new Map<string, StoredSubmission>();
  private entries = new Map<string, OutboxEntry>();

  async saveWithOutbox(submission: StoredSubmission, entry: OutboxEntry) {
    if (this.submissions.has(submission.uuid)) throw new Error(`duplicate submission ${submission.uuid}`);
    this.submissions.set(submission.uuid, submission);
    this.entries.set(entry.submissionUuid, entry);
  }

  private join(): StoredWithOutbox[] {
    return [...this.submissions.values()]
      .map((submission) => ({ submission, entry: this.entries.get(submission.uuid)! }))
      .sort((a, b) => a.submission.savedAt - b.submission.savedAt);
  }

  async list() { return this.join(); }
  async listDue(now: number, limit: number) { return this.join().filter((r) => isDue(r.entry, now)).slice(0, limit); }
  async listFailed() { return this.join().filter((r) => r.entry.status === 'failed'); }
  async updateEntry(entry: OutboxEntry) { this.entries.set(entry.submissionUuid, entry); }

  async recoverInterrupted(now: number) {
    let n = 0;
    for (const [id, e] of this.entries) {
      if (e.status === 'syncing') { this.entries.set(id, recoverInterrupted(e, now)); n += 1; }
    }
    return n;
  }

  async counts() {
    const c: Record<OutboxStatus, number> = { pending: 0, syncing: 0, synced: 0, failed: 0 };
    for (const e of this.entries.values()) c[e.status] += 1;
    return c;
  }

  async nextWakeAt() {
    const times = [...this.entries.values()].filter((e) => e.status === 'pending').map((e) => e.nextAttemptAt);
    return times.length ? Math.min(...times) : null;
  }
}
