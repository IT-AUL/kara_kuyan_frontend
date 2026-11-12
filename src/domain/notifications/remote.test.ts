import { buildNotificationFeed, DEFAULT_NOTIFICATION_PREFERENCES, selectNextSystemNotification } from './feed';
import {
  compareSemver,
  isExternalHttpsUrl,
  matchesAppVersion,
  mergeAnnouncementLists,
  parseRemoteAnnouncementsPayload,
  sanitizeNavigationTarget,
} from './remote';

describe('remote announcements parser & sanitizer', () => {
  const nowMs = Date.parse('2026-11-13T12:00:00Z');

  it('sanitizes internal routes and https URLs while rejecting unsafe schemes', () => {
    expect(sanitizeNavigationTarget('/scan')).toBe('/scan');
    expect(sanitizeNavigationTarget('/test-detail?id=TAT-1')).toBe('/test-detail?id=TAT-1');
    expect(sanitizeNavigationTarget('https://mon.tatarstan.ru/olympiad')).toBe(
      'https://mon.tatarstan.ru/olympiad',
    );
    expect(isExternalHttpsUrl('https://mon.tatarstan.ru/olympiad')).toBe(true);
    expect(isExternalHttpsUrl('/scan')).toBe(false);

    expect(sanitizeNavigationTarget('//evil.example/phish')).toBeUndefined();
    expect(sanitizeNavigationTarget('http://insecure.example/news')).toBeUndefined();
    expect(sanitizeNavigationTarget('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeNavigationTarget('file:///etc/passwd')).toBeUndefined();
    expect(sanitizeNavigationTarget('intent://scan#Intent;end')).toBeUndefined();
  });

  it('compares semver versions and filters minAppVersion / maxAppVersion accurately', () => {
    expect(compareSemver('0.4.1', '0.4.0')).toBe(1);
    expect(compareSemver('v0.4.0', '0.4.0')).toBe(0);
    expect(compareSemver('0.3.9', '0.4.0')).toBe(-1);

    expect(matchesAppVersion('0.4.1', '0.4.0', '0.5.0')).toBe(true);
    expect(matchesAppVersion('0.3.0', '0.4.0', undefined)).toBe(false);
    expect(matchesAppVersion('0.6.0', undefined, '0.5.9')).toBe(false);
  });

  it('parses envelope and array payloads, drops expired/mismatched items, and prevents local event prefix spoofing', () => {
    const raw = {
      version: 1,
      items: [
        {
          id: '2026-11-olympiad',
          kind: 'event',
          tone: 'ok',
          badge: 'Олимпиада РТ',
          title: 'Республиканская олимпиада по татарскому языку',
          summary: 'Подборка тренировочных заданий для 5–9 классов уже в конструкторе.',
          publishedAt: '2026-11-13T10:00:00Z',
          expiresAt: '2026-12-15T00:00:00Z',
          pinned: true,
          systemNotify: true,
          minAppVersion: '0.4.0',
          actionLabel: 'Собрать разминку',
          route: '/task-generate',
          secondaryActionLabel: 'Положение',
          secondaryRoute: 'https://mon.tatarstan.ru/olympiad',
        },
        {
          id: 'expired-item',
          title: 'Старый анонс',
          summary: 'Уже прошёл',
          expiresAt: '2026-11-01T00:00:00Z',
        },
        {
          id: 'future-version-only',
          title: 'Только для 0.9.0',
          summary: 'Ещё не вышло',
          minAppVersion: '0.9.0',
        },
        {
          id: 'event:sync-failed:99',
          title: 'Попытка подмены системного ключа',
          summary: 'Ключ должен быть изолирован в remote:*',
          route: 'javascript:evil()',
        },
      ],
    };

    const items = parseRemoteAnnouncementsPayload(raw, {
      currentVersion: '0.4.1',
      nowMs,
    });

    expect(items).toHaveLength(2);
    expect(items[0]?.id).toBe('2026-11-olympiad');
    expect(items[0]?.categoryId).toBe('remote_announcement');
    expect(items[0]?.route).toBe('/task-generate');
    expect(items[0]?.secondaryRoute).toBe('https://mon.tatarstan.ru/olympiad');

    expect(items[1]?.id).toBe('remote:event:sync-failed:99');
    expect(items[1]?.route).toBeUndefined();
    expect(items[1]?.actionLabel).toBeUndefined();
  });

  it('merges backend + CDN + curated items without duplicates and selects remote system notifications', () => {
    const backendItems = parseRemoteAnnouncementsPayload(
      [
        {
          id: 'shared-news-1',
          title: 'Серверная версия новости',
          summary: 'Приоритет у первого источника (бэкенд)',
          systemNotify: true,
          publishedAt: '2026-11-13T11:00:00Z',
        },
      ],
      { currentVersion: '0.4.1', nowMs },
    );
    const cdnItems = parseRemoteAnnouncementsPayload(
      [
        {
          id: 'shared-news-1',
          title: 'CDN-копия новости',
          summary: 'Не должна дублироваться',
        },
        {
          id: 'cdn-tip-1',
          kind: 'tip',
          title: 'Ноябрьская методическая карточка',
          summary: 'Разбор падежных окончаний -га/-гә, -ка/-кә',
          publishedAt: '2026-11-13T09:00:00Z',
        },
      ],
      { currentVersion: '0.4.1', nowMs },
    );

    const remoteMerged = mergeAnnouncementLists(backendItems, cdnItems);
    expect(remoteMerged.map((i) => i.id)).toEqual(['shared-news-1', 'cdn-tip-1']);
    expect(remoteMerged[0]?.title).toBe('Серверная версия новости');

    const feed = buildNotificationFeed([], new Set(), new Set(), remoteMerged);
    expect(feed.items.some((i) => i.id === 'shared-news-1')).toBe(true);
    expect(feed.items.some((i) => i.id === 'cdn-tip-1')).toBe(true);

    const candidate = selectNextSystemNotification(
      remoteMerged,
      new Set(),
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
    expect(candidate?.id).toBe('shared-news-1');
  });
});
