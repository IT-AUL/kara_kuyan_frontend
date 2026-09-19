import type { OutboxEntry, OutboxStatus } from '../domain/sync/outbox';
import type { SubmissionPayload } from '../domain/sync/payload';

export type StoredSubmission = {
  uuid: string;
  assignmentId: string;
  classId: string;
  payload: SubmissionPayload;
  savedAt: number;
};

export type StoredWithOutbox = { submission: StoredSubmission; entry: OutboxEntry };

/** Durable local source of truth (ADR 0004). Implementations must make `saveWithOutbox` atomic. */
export interface SubmissionStore {
  /** Writes the submission and its outbox row in ONE transaction: both or neither. */
  saveWithOutbox(submission: StoredSubmission, entry: OutboxEntry): Promise<void>;
  list(): Promise<readonly StoredWithOutbox[]>;
  /** Pending entries whose `nextAttemptAt` has passed, oldest first. */
  listDue(now: number, limit: number): Promise<readonly StoredWithOutbox[]>;
  listFailed(): Promise<readonly StoredWithOutbox[]>;
  updateEntry(entry: OutboxEntry): Promise<void>;
  /** Puts entries left in `syncing` by a killed process back to `pending`; returns how many. */
  recoverInterrupted(now: number): Promise<number>;
  counts(): Promise<Readonly<Record<OutboxStatus, number>>>;
  /** Earliest `nextAttemptAt` among pending entries, or null. */
  nextWakeAt(): Promise<number | null>;
}
