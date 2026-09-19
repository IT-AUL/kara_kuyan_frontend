import { ApiClient, isRetryable } from '@/adapters/api/client';
import { num, obj } from '@/adapters/api/guards';
import type { SendResult, SyncGateway, SyncRequest } from '@/ports/sync-gateway';

/**
 * Real backend gateway: `POST /api/v1/submissions/batch-sync` with one submission per request.
 * Composition uses it only when `EXPO_PUBLIC_API_URL` is set, so no demo data reaches a public server
 * unless someone opts in. 2xx ok; 4xx rejected (no automatic retry); network/timeout/5xx/408/429 retry.
 */
export class HttpGateway implements SyncGateway {
  constructor(private readonly client: ApiClient) {}

  async send(request: SyncRequest): Promise<SendResult> {
    const result = await this.client.request(
      '/api/v1/submissions/batch-sync',
      (json) => {
        const r = obj(json, 'batch-sync');
        return { inserted: num(r.inserted_count, 'inserted_count'), updated: num(r.updated_count, 'updated_count') };
      },
      {
        method: 'POST',
        body: {
          assignment_id: request.assignmentId,
          class_id: request.classId,
          synced_at: request.syncedAt,
          submissions: [request.submission],
        },
      },
    );
    if (result.ok) return { kind: 'ok', ...result.value };
    return isRetryable(result.error)
      ? { kind: 'retry', error: result.error.message }
      : { kind: 'rejected', error: result.error.message };
  }
}
