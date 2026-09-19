import { ApiClient, isRetryable } from './client';

const uuid = async () => 'u-1';
const asString = (json: unknown) => {
  if (typeof json !== 'string') throw new Error('not a string');
  return json;
};

function client(fetchImpl: typeof fetch, timeoutMs = 50) {
  return new ApiClient({ baseUrl: 'https://x.test/', teacherUuid: uuid, timeoutMs, fetchImpl });
}

const reply = (status: number, body: string) => (async () => new Response(body, { status })) as unknown as typeof fetch;

describe('ApiClient', () => {
  it('sends the teacher header, query and JSON body, and parses the answer', async () => {
    const spy = jest.fn(async () => new Response('"ok"', { status: 200 }));
    const r = await client(spy as unknown as typeof fetch).request('/p', asString, { method: 'POST', body: { a: 1 }, query: { v: 2, skip: undefined } });
    expect(r).toEqual({ ok: true, value: 'ok' });
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://x.test/p?v=2');
    expect((init.headers as Record<string, string>)['X-Teacher-UUID']).toBe('u-1');
    expect(init.body).toBe('{"a":1}');
  });

  it('classifies 5xx as retryable and 4xx as final', async () => {
    const e500 = await client(reply(500, 'boom')).request('/p', asString);
    const e422 = await client(reply(422, '{}')).request('/p', asString);
    expect(e500.ok || isRetryable(e500.error)).toBe(true);
    expect(!e422.ok && e422.error.kind === 'http' && !isRetryable(e422.error)).toBe(true);
  });

  it('reports non-JSON and failed validation as invalid', async () => {
    const notJson = await client(reply(200, 'oops')).request('/p', asString);
    const badShape = await client(reply(200, '5')).request('/p', asString);
    expect(!notJson.ok && notJson.error.kind).toBe('invalid');
    expect(!badShape.ok && badShape.error.kind).toBe('invalid');
  });

  it('maps a hung request to timeout and a thrown fetch to network', async () => {
    const hang = ((_: string, init: RequestInit) =>
      new Promise((_res, rej) => init.signal?.addEventListener('abort', () => rej(new Error('aborted'))))) as unknown as typeof fetch;
    const t = await client(hang, 20).request('/p', asString);
    const n = await client((async () => { throw new Error('offline'); }) as unknown as typeof fetch).request('/p', asString);
    expect(!t.ok && t.error.kind).toBe('timeout');
    expect(!n.ok && n.error.kind).toBe('network');
    expect(!n.ok && isRetryable(n.error)).toBe(true);
  });
});
