import type { SubmissionPayload } from '../domain/sync/payload';

export type SyncRequest = {
  assignmentId: string;
  classId: string;
  /** ISO time of this attempt. */
  syncedAt: string;
  /** One submission per request: the backend accepts or rejects a whole request. */
  submission: SubmissionPayload;
};

export type SendResult =
  | { kind: 'ok'; inserted: number; updated: number }
  /** Network error, timeout or 5xx: try again later. */
  | { kind: 'retry'; error: string }
  /** 4xx: the backend refuses this submission; do not retry automatically. */
  | { kind: 'rejected'; error: string };

export interface SyncGateway {
  send(request: SyncRequest): Promise<SendResult>;
}

export interface Clock {
  now(): number;
}
