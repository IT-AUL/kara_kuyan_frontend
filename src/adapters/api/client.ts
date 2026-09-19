// Thin JSON client for the Kara Kuyan backend. The only place that calls `fetch` for API traffic (ADR 0002).

export type ApiError =
  | { kind: 'network'; message: string }
  | { kind: 'timeout'; message: string }
  /** Non-2xx answer; `retryable` is true for 5xx, 408 and 429. */
  | { kind: 'http'; status: number; message: string; retryable: boolean }
  | { kind: 'invalid'; message: string };

export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };

export type ApiClientOptions = {
  baseUrl: string;
  /** Resolves the current `X-Teacher-UUID`; called per request so a rotated identity is picked up. */
  teacherUuid: () => Promise<string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
};

export class ApiClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ApiClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** Requests JSON and validates it with `parse` (throws inside `parse` mean an invalid answer). */
  async request<T>(path: string, parse: (json: unknown) => T, opts: RequestOptions = {}): Promise<ApiResult<T>> {
    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? this.options.timeoutMs ?? 15_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const uuid = await this.options.teacherUuid();
      const res = await this.fetchImpl(this.url(path, opts.query), {
        method: opts.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          'X-Teacher-UUID': uuid,
          ...(opts.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = (await res.text().catch(() => '')).slice(0, 200);
        const retryable = res.status >= 500 || res.status === 408 || res.status === 429;
        return { ok: false, error: { kind: 'http', status: res.status, message: `HTTP ${res.status} ${text}`.trim(), retryable } };
      }
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        return { ok: false, error: { kind: 'invalid', message: 'response is not JSON' } };
      }
      try {
        return { ok: true, value: parse(json) };
      } catch (e) {
        return { ok: false, error: { kind: 'invalid', message: e instanceof Error ? e.message : String(e) } };
      }
    } catch (e) {
      if (controller.signal.aborted) return { ok: false, error: { kind: 'timeout', message: `no answer in ${timeoutMs} ms` } };
      return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Absolute URL and auth headers for file downloads (PDF, XLSX) done by a file adapter, not by JSON requests. */
  async downloadTarget(path: string, query?: RequestOptions['query']): Promise<{ url: string; headers: Record<string, string> }> {
    return { url: this.url(path, query), headers: { 'X-Teacher-UUID': await this.options.teacherUuid() } };
  }

  private url(path: string, query?: RequestOptions['query']): string {
    const base = this.options.baseUrl.replace(/\/+$/, '');
    const params = Object.entries(query ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `${base}${path}${params ? `?${params}` : ''}`;
  }
}

/** True when the error is worth retrying later (network, timeout, 5xx/408/429). */
export function isRetryable(error: ApiError): boolean {
  return error.kind === 'network' || error.kind === 'timeout' || (error.kind === 'http' && error.retryable);
}
