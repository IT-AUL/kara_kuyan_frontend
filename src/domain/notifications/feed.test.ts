import {
  CURATED_NEWS_AND_TIPS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CHANNELS,
  buildNotificationFeed,
  deriveLiveFeedEvents,
  parseNotificationPreferences,
  selectNextSystemNotification,
  type LiveEventsInput,
} from './feed';

const baseInput: LiveEventsInput = {
  classId: 'cls-7a',
  className: '7-А',
  assignmentId: 'test-1',
  assignmentTitle: 'Сингармонизм и аффиксы',
  checkedCount: 10,
  studentCount: 24,
  outboxCounts: { pending: 0, syncing: 0, synced: 10, failed: 0 },
  topMistake: null,
  availableRelease: null,
  nowMs: 1_760_000_000_000,
};

describe('notifications & news feed domain', () => {
  it('defines 4 granular Android notification channels and parses preferences resiliently', () => {
    expect(NOTIFICATION_CHANNELS.map((c) => c.id)).toEqual([
      'check_sync',
      'class_insights',
      'updates_news',
      'teacher_tips',
    ]);
    expect(parseNotificationPreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(parseNotificationPreferences('{broken-json')).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    const custom = parseNotificationPreferences(
      JSON.stringify({
        systemEnabled: true,
        channels: { class_insights: false },
        afterSchoolReminder: true,
        reminderHour: 16,
        reminderMinute: 15,
      }),
    );
    expect(custom.channels.class_insights).toBe(false);
    expect(custom.channels.check_sync).toBe(true);
    expect(custom.afterSchoolReminder).toBe(true);
    expect(custom.reminderHour).toBe(16);
    expect(custom.reminderMinute).toBe(15);
  });

  it('emits pack-complete, sync-failed, topic-insight, and release-update events without student PII', () => {
    const events = deriveLiveFeedEvents({
      ...baseInput,
      checkedCount: 24,
      studentCount: 24,
      outboxCounts: { pending: 0, syncing: 0, synced: 22, failed: 2 },
      topMistake: {
        topicCode: 'vowel_harmony',
        topicName: 'Закон сингармонизма',
        affectedStudents: 8,
        failureRatePct: 52.4,
      },
      availableRelease: { version: '0.5.0', notes: 'Улучшена скорость сканера.' },
    });

    expect(events.map((e) => e.id)).toEqual([
      'news:release:0.5.0',
      'event:sync-failed:2',
      'event:pack-complete:cls-7a:test-1:24',
      'insight:topic:cls-7a:vowel_harmony',
    ]);
    expect(events[2]?.route).toBe('/export-gradebook');
    expect(events[3]?.secondaryRoute).toBe('/task-generate');
  });

  it('merges curated news & tips, computes unread counts, and respects dismissals', () => {
    const live = deriveLiveFeedEvents({
      ...baseInput,
      checkedCount: 24,
      studentCount: 24,
    });
    const readIds = new Set<string>(CURATED_NEWS_AND_TIPS.map((i) => i.id));
    const dismissed = new Set<string>(['tip:offline-outbox']);
    const feed = buildNotificationFeed(live, readIds, dismissed);

    expect(feed.unreadCount).toBe(1);
    expect(feed.items[0]?.id).toBe('news:v0.4.0-cpp-ocr'); // pinned item first
    expect(feed.items.some((i) => i.id === 'tip:offline-outbox')).toBe(false);
    expect(feed.items.find((i) => i.id === 'event:pack-complete:cls-7a:test-1:24')?.unread).toBe(true);
  });

  it('throttles to at most one new system notification per cycle and honors per-channel opt-out', () => {
    const live = deriveLiveFeedEvents({
      ...baseInput,
      checkedCount: 24,
      studentCount: 24,
      outboxCounts: { pending: 0, syncing: 0, synced: 22, failed: 1 },
    });
    const notified = new Set<string>();

    const first = selectNextSystemNotification(live, notified, DEFAULT_NOTIFICATION_PREFERENCES);
    expect(first?.id).toBe('event:sync-failed:1');

    notified.add(first!.id);
    const second = selectNextSystemNotification(live, notified, DEFAULT_NOTIFICATION_PREFERENCES);
    expect(second?.id).toBe('event:pack-complete:cls-7a:test-1:24');

    // Muting check_sync suppresses check_sync notifications
    const muted = selectNextSystemNotification(live, new Set(), {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      channels: { ...DEFAULT_NOTIFICATION_PREFERENCES.channels, check_sync: false },
    });
    expect(muted).toBeNull();
  });
});
