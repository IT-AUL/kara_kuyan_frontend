import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  AppIcon,
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  colors,
  fontFamilies,
  fontSizes,
  hairline,
  radius,
  spacing,
  textStyles,
  touchTarget,
} from '@/design-system';
import { withAlpha } from '@/design-system/color';
import { estimateReadMinutes, formatFeedShortDate } from '@/domain/notifications/article';
import { NOTIFICATION_CHANNELS, type FeedViewItem } from '@/domain/notifications/feed';

import { notificationCenter, useNotificationCenter } from './notificationCenter';
import {
  badgeColorFor,
  iconFor,
  iconSurfaceFor,
  iconTintFor,
} from './notificationVisuals';

type TabKey = 'all' | 'events' | 'news' | 'settings';

const TAB_KEYS: readonly TabKey[] = ['all', 'events', 'news', 'settings'];
const TAB_LABELS: readonly string[] = ['Все', 'События', 'Инфо', 'Настройки'];

export function FeedRow({
  item,
  isLast,
  onOpen,
}: {
  item: FeedViewItem;
  isLast: boolean;
  onOpen: () => void;
}) {
  const shortDate = formatFeedShortDate(item.createdAt);
  const readMins = estimateReadMinutes(
    item.summary,
    item.body !== item.summary ? item.body : null,
  );
  const metaTail = [shortDate, `${readMins} мин`].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityLabel={`${item.unread ? 'Новое. ' : ''}${item.badge}. ${item.title}. ${item.summary}`}
      accessibilityRole="button"
      android_ripple={{ color: withAlpha(colors.text, 0.08) }}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.feedRow,
        !isLast && styles.rowDivider,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: iconSurfaceFor(item.tone, item.unread) },
        ]}
      >
        <AppIcon
          color={iconTintFor(item.tone, item.unread)}
          name={iconFor(item.icon)}
          size={20}
        />
      </View>

      <View style={styles.rowCenter}>
        <View style={styles.metaLine}>
          {item.unread ? <View style={styles.unreadDot} /> : null}
          <Text
            numberOfLines={1}
            style={[styles.badgeText, { color: badgeColorFor(item.tone, item.unread) }]}
          >
            {item.badge}
          </Text>
          {metaTail ? (
            <Text numberOfLines={1} style={styles.metaDateText}>
              · {metaTail}
            </Text>
          ) : null}
        </View>

        <Text
          numberOfLines={2}
          style={item.unread ? styles.rowTitleUnread : styles.rowTitleRead}
        >
          {item.title}
        </Text>

        <Text numberOfLines={2} style={styles.rowSummary}>
          {item.summary}
        </Text>
      </View>

      <View style={styles.chevronWrap}>
        <AppIcon color={colors.textFaint} name="chevronRight" size={18} />
      </View>
    </Pressable>
  );
}

function formatSyncTimestamp(ms: number | null): string {
  if (!ms) return 'Локальный кеш готов · фоновая синхронизация активна';
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Обновлено сегодня в ${hh}:${mm} · фоновая проверка активна`;
}

export function NotificationsScreen() {
  const router = useRouter();
  const state = useNotificationCenter();
  const [tabIndex, setTabIndex] = useState(0);
  const tab: TabKey = TAB_KEYS[tabIndex] ?? 'all';

  const visibleItems = state.items.filter((item) => {
    if (tab === 'events') return item.kind === 'event' || item.kind === 'insight';
    if (tab === 'news') return item.kind === 'news' || item.kind === 'tip';
    return true;
  });

  const handleOpenArticle = (id: string) => {
    notificationCenter.markRead(id);
    router.push({ pathname: '/notification-detail', params: { id } });
  };

  const showOptInStrip = state.permission !== 'granted' && tab !== 'settings';

  return (
    <Screen
      edges={['top']}
      onRefresh={() => {
        void notificationCenter.refreshRemoteFeed({ force: true });
      }}
      refreshing={state.syncingRemote}
    >
      <ScreenHeader
        right={
          state.unreadCount > 0 ? (
            <Pressable
              accessibilityLabel="Отметить все прочитанными"
              accessibilityRole="button"
              onPress={() => notificationCenter.markAllRead()}
              style={({ pressed }) => [styles.readAllBtn, pressed && styles.pressed]}
            >
              <Text style={styles.readAllText}>Прочитать все</Text>
            </Pressable>
          ) : undefined
        }
        showBack
        subtitle={
          state.unreadCount > 0
            ? `Непрочитанных: ${state.unreadCount}`
            : 'События, обновления и полезные памятки'
        }
        title="Уведомления"
      />

      <SegmentedTabs
        activeIndex={tabIndex}
        onTabChange={setTabIndex}
        tabs={TAB_LABELS}
      />

      {showOptInStrip ? (
        <View style={styles.optInStrip}>
          <View style={styles.optInIcon}>
            <AppIcon color={colors.primary} name="bellBadge" size={18} />
          </View>
          <View style={styles.optInCopy}>
            <Text numberOfLines={1} style={styles.optInTitle}>
              Уведомления в шторке Android
            </Text>
            <Text numberOfLines={1} style={styles.optInSubtitle}>
              Только проверка класса и важные события
            </Text>
          </View>
          <Pressable
            accessibilityLabel={
              state.permission === 'denied'
                ? 'Открыть настройки уведомлений Android'
                : 'Включить системные уведомления'
            }
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => {
              if (state.permission === 'denied') {
                void notificationCenter.openSystemSettings();
              } else {
                void notificationCenter.requestOptIn();
              }
            }}
            style={({ pressed }) => [styles.optInAction, pressed && styles.pressed]}
          >
            <Text style={styles.optInActionText}>
              {state.permission === 'denied' ? 'Настройки' : 'Включить'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {tab === 'settings' ? (
        <View style={styles.settingsStack}>
          <Card outlined style={styles.settingsCard} tone="raised">
            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={textStyles.titleSmall}>Системные уведомления Android</Text>
                <Text style={textStyles.bodySmall}>
                  {state.permission === 'granted'
                    ? 'Разрешение выдано. Вы можете гибко включать нужные категории ниже.'
                    : state.permission === 'denied'
                      ? 'Разрешение отключено в настройках Android.'
                      : 'Включите, чтобы получать важные оповещения в шторке телефона.'}
                </Text>
              </View>
              {state.permission === 'granted' ? (
                <Switch
                  accessibilityLabel="Системные уведомления Android"
                  onValueChange={(v) => notificationCenter.setSystemEnabled(v)}
                  thumbColor={state.preferences.systemEnabled ? colors.primary : colors.textMuted}
                  trackColor={{ false: colors.surfaceHigh, true: colors.primaryDeep }}
                  value={state.preferences.systemEnabled}
                />
              ) : null}
            </View>

            {state.permission !== 'granted' ? (
              <Button
                onPress={() => {
                  if (state.permission === 'denied') {
                    void notificationCenter.openSystemSettings();
                  } else {
                    void notificationCenter.requestOptIn();
                  }
                }}
                title={
                  state.permission === 'denied'
                    ? 'Открыть системные настройки'
                    : 'Разрешить уведомления'
                }
              />
            ) : null}
          </Card>

          <Card outlined style={styles.listCard}>
            <Text style={styles.sectionEyebrow}>Категории уведомлений</Text>
            {NOTIFICATION_CHANNELS.map((ch, idx) => {
              const enabled = state.preferences.channels[ch.id];
              return (
                <View
                  key={ch.id}
                  style={[styles.channelRow, idx < NOTIFICATION_CHANNELS.length - 1 && styles.rowDivider]}
                >
                  <View style={styles.switchTextWrap}>
                    <Text style={styles.channelTitle}>{ch.title}</Text>
                    <Text style={textStyles.bodySmall}>{ch.description}</Text>
                  </View>
                  <Switch
                    accessibilityLabel={ch.title}
                    disabled={!state.preferences.systemEnabled}
                    onValueChange={(v) => notificationCenter.setChannelEnabled(ch.id, v)}
                    thumbColor={enabled ? colors.primary : colors.textMuted}
                    trackColor={{ false: colors.surfaceHigh, true: colors.primaryDeep }}
                    value={enabled}
                  />
                </View>
              );
            })}
          </Card>

          <Card outlined style={styles.settingsCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={textStyles.titleSmall}>Напоминание после уроков (15:30)</Text>
                <Text style={textStyles.bodySmall}>
                  Тихое ежедневное напоминание проверить оставшуюся пачку или выгрузить оценки в журнал.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Напоминание после уроков в 15:30"
                onValueChange={(v) => notificationCenter.setAfterSchoolReminder(v)}
                thumbColor={state.preferences.afterSchoolReminder ? colors.primary : colors.textMuted}
                trackColor={{ false: colors.surfaceHigh, true: colors.primaryDeep }}
                value={state.preferences.afterSchoolReminder}
              />
            </View>
          </Card>

          <Card outlined style={styles.settingsCard}>
            <Text style={textStyles.titleSmall}>Удалённая лента новостей и анонсов</Text>
            <Text style={textStyles.bodySmall}>
              {formatSyncTimestamp(state.lastSyncedAt)}
            </Text>
            <Button
              onPress={() => {
                void notificationCenter.refreshRemoteFeed({ force: true });
              }}
              title={state.syncingRemote ? 'Проверяем обновления…' : 'Проверить новости сейчас'}
              variant="secondary"
            />
          </Card>

          <Card outlined style={styles.settingsCard}>
            <Text style={textStyles.titleSmall}>Проверка работы шторки Android</Text>
            <Text style={textStyles.bodySmall}>
              Отправит демонстрационное уведомление с быстрыми кнопками «В журнал» и «Итоги».
            </Text>
            <Button
              onPress={() => {
                void notificationCenter.sendTestNotification();
              }}
              title={
                state.testBannerSentAt
                  ? 'Проверочное уведомление отправлено ✓'
                  : 'Отправить проверочное уведомление'
              }
              variant="secondary"
            />
          </Card>
        </View>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          body="Когда появятся новые события по классам, синхронизации или обновлениям, они отобразятся здесь."
          icon="bell"
          title="Пока всё спокойно"
        />
      ) : (
        <Card outlined style={styles.feedContainer}>
          {visibleItems.map((item, idx) => (
            <FeedRow
              isLast={idx === visibleItems.length - 1}
              item={item}
              key={item.id}
              onOpen={() => handleOpenArticle(item.id)}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeText: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.caption,
    lineHeight: 16,
    maxWidth: '62%',
  },
  channelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  channelTitle: {
    ...textStyles.bodySmall,
    color: colors.text,
    fontFamily: fontFamilies.semibold,
  },
  chevronWrap: {
    justifyContent: 'center',
    paddingLeft: 2,
  },
  feedContainer: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  feedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 80,
    paddingVertical: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  listCard: {
    gap: spacing.xxs,
  },
  metaDateText: {
    color: colors.textFaint,
    flexShrink: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.caption,
    lineHeight: 16,
  },
  metaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  optInAction: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  optInActionText: {
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.caption,
  },
  optInCopy: {
    flex: 1,
    gap: 1,
  },
  optInIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  optInStrip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.xl,
    borderWidth: hairline,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  optInSubtitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.caption,
    lineHeight: 16,
  },
  optInTitle: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 13.5,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.78,
  },
  readAllBtn: {
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xs,
  },
  readAllText: {
    ...textStyles.caption,
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
  },
  rowCenter: {
    flex: 1,
    gap: 3,
  },
  rowDivider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  rowSummary: {
    color: colors.textMuted,
    fontFamily: fontFamilies.regular,
    fontSize: 13.5,
    lineHeight: 19,
  },
  rowTitleRead: {
    color: withAlpha(colors.text, 0.86),
    fontFamily: fontFamilies.medium,
    fontSize: 15.5,
    lineHeight: 21,
  },
  rowTitleUnread: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 15.5,
    lineHeight: 21,
  },
  sectionEyebrow: {
    ...textStyles.caption,
    letterSpacing: 0.8,
    paddingBottom: spacing.xxs,
    textTransform: 'uppercase',
  },
  settingsCard: {
    gap: spacing.sm,
  },
  settingsStack: {
    gap: spacing.sm,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  switchTextWrap: {
    flex: 1,
    gap: 2,
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
});
