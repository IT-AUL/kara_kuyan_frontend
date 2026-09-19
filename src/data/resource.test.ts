import type { KeyValueStore } from '@/ports/key-value';

import { Resource } from './resource';

const memoryKv = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v), remove: (k) => void data.delete(k) };
};

describe('Resource', () => {
  it('loads from the network and caches the value', async () => {
    const kv = memoryKv();
    const r = new Resource<number[]>('k', async () => ({ ok: true, value: [1, 2] }), kv);
    await r.refresh();
    expect(r.getState()).toMatchObject({ status: 'ready', data: [1, 2], offline: false });
    expect(kv.get('res:k')).toBe('[1,2]');
  });

  it('starts from the cache and keeps it (offline) when the server is down', async () => {
    const kv = memoryKv();
    kv.set('res:k', '[7]');
    const r = new Resource<number[]>('k', async () => ({ ok: false, error: { kind: 'network', message: 'down' } }), kv);
    expect(r.getState()).toMatchObject({ status: 'ready', data: [7] });
    await r.refresh();
    expect(r.getState()).toMatchObject({ status: 'ready', data: [7], offline: true, error: 'down' });
  });

  it('reports an error when there is nothing cached, and shares one in-flight refresh', async () => {
    const fetcher = jest.fn(async () => ({ ok: false as const, error: { kind: 'timeout' as const, message: 'slow' } }));
    const r = new Resource<number>('k', fetcher, null);
    await Promise.all([r.refresh(), r.refresh()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r.getState()).toMatchObject({ status: 'error', data: null, error: 'slow' });
  });

  it('ignores a corrupted cache entry', () => {
    const kv = memoryKv();
    kv.set('res:k', '{not json');
    expect(new Resource<number>('k', async () => ({ ok: true, value: 1 }), kv).getState().data).toBeNull();
  });
});
