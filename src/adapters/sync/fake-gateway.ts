import type { SubmissionPayload } from '@/domain/sync/payload';
import type { SendResult, SyncGateway, SyncRequest } from '@/ports/sync-gateway';

export type FakeMode = 'online' | 'offline' | 'lost-response' | 'reject';

/**
 * Stand-in for the backend that mimics its current behaviour (commit 796601e): upsert by
 * `client_submission_uuid`, all-or-nothing per request. Used by tests and the dev lab; no network.
 */
export class FakeGateway implements SyncGateway {
  mode: FakeMode = 'online';
  delayMs = 0;
  readonly records = new Map<string, SubmissionPayload>();
  calls = 0;
  inserted = 0;
  updated = 0;

  async send(request: SyncRequest): Promise<SendResult> {
    this.calls += 1;
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.mode === 'offline') return { kind: 'retry', error: 'network unreachable' };
    if (this.mode === 'reject') return { kind: 'rejected', error: 'HTTP 422' };
    const uuid = request.submission.client_submission_uuid;
    const existed = this.records.has(uuid);
    this.records.set(uuid, request.submission);
    if (existed) this.updated += 1; else this.inserted += 1;
    // the request reached the server but the response was lost: the client must resend safely
    if (this.mode === 'lost-response') return { kind: 'retry', error: 'timeout waiting for response' };
    return { kind: 'ok', inserted: existed ? 0 : 1, updated: existed ? 1 : 0 };
  }
}
