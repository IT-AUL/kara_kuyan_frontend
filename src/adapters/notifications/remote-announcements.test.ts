import { ApiClient } from '@/adapters/api/client';
import type { KeyValueStore } from '@/ports/key-value';

import { createAnnouncementsAdapter } from './remote-announcements';

function createMemoryKv(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => {
      map.set(k, v);
    },
    remove: (k) => {
      map.delete(k);
    },
  };
}

describe('createAnnouncementsAdapter (dual-source Backend + CDN ETag + offline cache)', () => {
  it('handles backend 404 silently, caches CDN announcements with ETag 304, and survives offline', async () => {
    const kv = createMemoryKv();
    let clock = Date.parse('2026-11-13T12:00:00Z');
    const seenIfNoneMatch: (string | null)[] = [];
    let offline = false;

    const mockFetch: typeof fetch = async (input, init) => {
      if (offline) throw new Error('Network down');
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/announcements')) {
        return new Response('Not Found', { status: 404 });
      }
      const headers = new Headers(init?.headers);
      const inm = headers.get('If-None-Match');
      seenIfNoneMatch.push(inm);
      if (inm === '"etag-v1"') {
        return new Response(null, { status: 304 });
      }
      return new Response(
        JSON.stringify({
          version: 1,
          items: [
            {
              id: 'cdn-olympiad-2026',
              kind: 'event',
              title: 'Олимпиада по татарскому языку',
              summary: 'Подборка тренировочных карточек для 5–9 классов.',
              publishedAt: '2026-11-13T10:00:00Z',
              systemNotify: true,
              route: '/task-generate',
            },
          ],
        }),
        {
          status: 200,
          headers: { ETag: '"etag-v1"', 'Content-Type': 'application/json' },
        },
      );
    };

    const apiClient = new ApiClient({
      baseUrl: 'https://api.kara-kuyan.it-aul.ru',
      teacherUuid: async () => 'teacher-uuid-1',
      fetchImpl: mockFetch,
    });

    const adapter = createAnnouncementsAdapter({
      apiClient,
      kvStore: kv,
      currentVersion: () => '0.4.1',
      cdnUrl: 'https://it-aul.github.io/kara_kuyan_frontend/announcements.json',
      fetchImpl: mockFetch,
      now: () => clock,
    });

    // 1. First sync: backend 404 + CDN 200 OK
    const first = await adapter.refresh();
    expect(first.fromNetwork).toBe(true);
    expect(first.items.map((i) => i.id)).toEqual(['cdn-olympiad-2026']);
    expect(seenIfNoneMatch).toEqual([null]);

    // 2. Immediate non-forced refresh within 3 min throttle uses SQLite cache without network
    clock += 30_000;
    const throttled = await adapter.refresh();
    expect(throttled.fromNetwork).toBe(false);
    expect(throttled.items).toHaveLength(1);
    expect(seenIfNoneMatch).toHaveLength(1);

    // 3. Forced refresh (pull-to-refresh) sends If-None-Match and receives 304 Not Modified
    clock += 10_000;
    const conditional = await adapter.refresh({ force: true });
    expect(conditional.fromNetwork).toBe(true);
    expect(conditional.items.map((i) => i.id)).toEqual(['cdn-olympiad-2026']);
    expect(seenIfNoneMatch).toEqual([null, '"etag-v1"']);

    // 4. Offline mode still serves cached SQLite announcements
    offline = true;
    clock += 10 * 60_000;
    const cachedOffline = await adapter.refresh({ force: true });
    expect(cachedOffline.fromNetwork).toBe(false);
    expect(cachedOffline.items.map((i) => i.id)).toEqual(['cdn-olympiad-2026']);
    expect(adapter.cached().map((i) => i.id)).toEqual(['cdn-olympiad-2026']);
  });

  it('automatically merges backend /api/v1/announcements when deployed alongside CDN', async () => {
    const kv = createMemoryKv();
    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/announcements')) {
        return new Response(
          JSON.stringify({
            version: 1,
            items: [
              {
                id: 'backend-school-notice',
                kind: 'event',
                title: 'Серверное объявление для школы',
                summary: 'Обновлён банк заданий четверти.',
                publishedAt: '2026-11-13T11:30:00Z',
                systemNotify: true,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify([
          {
            id: 'cdn-tip-glare',
            kind: 'tip',
            title: 'Совет по съёмке при вечернем освещении',
            summary: 'Наклоните телефон на 5°, если лампа бликует.',
            publishedAt: '2026-11-13T09:00:00Z',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const apiClient = new ApiClient({
      baseUrl: 'https://api.kara-kuyan.it-aul.ru',
      teacherUuid: async () => 'teacher-uuid-1',
      fetchImpl: mockFetch,
    });

    const adapter = createAnnouncementsAdapter({
      apiClient,
      kvStore: kv,
      currentVersion: () => '0.4.1',
      fetchImpl: mockFetch,
      now: () => Date.parse('2026-11-13T12:00:00Z'),
    });

    const res = await adapter.refresh({ force: true });
    expect(res.fromNetwork).toBe(true);
    expect(res.items.map((i) => i.id)).toEqual(['backend-school-notice', 'cdn-tip-glare']);
  });
});
