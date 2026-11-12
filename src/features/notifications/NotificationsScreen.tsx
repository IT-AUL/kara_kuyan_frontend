import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  AppIcon,
  type AppIconName,
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  StatusPill,
  colors,
  fontFamilies,
  hairline,
  radius,
  spacing,
  textStyles,
  touchTarget,
} from '@/design-system';
import {
  NOTIFICATION_CHANNELS,
  type FeedIconKind,
  type FeedTone,
  type FeedViewItem,
} from '@/domain/notifications/feed';

import { notificationCenter, useNotificationCenter } from './notificationCenter';

type TabKey = 'all' | 'events' | 'news' | 'settings';

const TAB_KEYS: readonly TabKey[] = ['all', 'events', 'news', 'settings'];
const TAB_LABELS: readonly string[] = ['Все', 'События', 'Инфо', 'Настройки'];

function iconFor(kind: FeedIconKind): AppIconName {
  switch (kind) {
    case 'check':
      return 'checkCircle';
    case 'sync':
      return 'sync';
    case 'warning':
      return 'warning';
    case 'insight':
      return 'insight';
    case 'release':
      return 'download';
    case 'news':
      return 'news';
    case 'tip':
      return 'school';
  }
}

function pillToneFor(tone: FeedTone): 'success' | 'warning' | 'error' | 'info' {
  switch (tone) {
    case 'ok':
      return 'success';
    case 'warn':
      return 'warning';
    case 'err':
      return 'error';
    case 'info':
      return 'info';
  }
}

function FeedCard({
  item,
  expanded,
  onToggleExpand,
  onNavigate,
  onDismiss,
}: {
  item: FeedViewItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onNavigate: (route: string) => void;
  onDismiss: () => void;
}) {
  return (
    <Card
      accessibilityLabel={`${item.badge}: ${item.title}`}
      outlined
      style={item.unread ? styles.feedCardUnread : styles.feedCard}
      tone={item.unread ? 'raised' : 'surface'}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.badgeRow}>
          {item.unread ? <View style={styles.unreadDot} /> : null}
          <StatusPill label={item.badge} tone={pillToneFor(item.tone)} />
        </View>
        <Pressable
          accessibilityLabel={`Скрыть: ${item.title}`}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onDismiss}
          style={styles.dismissBtn}
        >
          <AppIcon color={colors.textFaint} name="close" size={18} />
        </Pressable>
      </View>

      <Pressable
        accessibilityLabel={`${expanded ? 'Свернуть' : 'Подробнее'}: ${item.title}`}
        accessibilityRole="button"
        onPress={onToggleExpand}
        style={({ pressed }) => [styles.titlePressable, pressed && styles.pressed]}
      >
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <AppIcon color={colors.primary} name={iconFor(item.icon)} size={20} />
          </View>
          <View style={styles.titleTextWrap}>
            <Text style={textStyles.titleSmall}>{item.title}</Text>
            <Text style={[textStyles.bodySmall, styles.summaryText]}>{item.summary}</Text>
          </View>
        </View>

        {expanded ? (
          <View style={styles.expandedWrap}>
            <Text style={[textStyles.bodySmall, styles.bodyText]}>{item.body}</Text>
          </View>
        ) : null}
      </Pressable>

      {item.actionLabel || item.secondaryActionLabel ? (
        <View style={styles.actionsRow}>
          {item.actionLabel && item.route ? (
            <Pressable
              accessibilityLabel={item.actionLabel}
              accessibilityRole="button"
              onPress={() => onNavigate(item.route!)}
              style={({ pressed }) => [styles.primaryChip, pressed && styles.pressed]}
            >
              <Text style={styles.primaryChipLabel}>{item.actionLabel}</Text>
              <AppIcon color={colors.toastText} name="arrowRight" size={16} />
            </Pressable>
          ) : null}

          {item.secondaryActionLabel && item.secondaryRoute ? (
            <Pressable
              accessibilityLabel={item.secondaryActionLabel}
              accessibilityRole="button"
              onPress={() => onNavigate(item.secondaryRoute!)}
              style={({ pressed }) => [styles.secondaryChip, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryChipLabel}>{item.secondaryActionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

export function NotificationsScreen() {
  const router = useRouter();
  const state = useNotificationCenter();
  const [tabIndex, setTabIndex] = useState(0);
  const tab: TabKey = TAB_KEYS[tabIndex] ?? 'all';
  const [expandedId, setExpandedId] = useState<string | null>(state.items[0]?.id ?? null);

  const visibleItems = state.items.filter((item) => {
    if (tab === 'events') return item.kind === 'event' || item.kind === 'insight';
    if (tab === 'news') return item.kind === 'news' || item.kind === 'tip';
    return true;
  });

  const handleOpenRoute = (id: string, route: string) => {
    notificationCenter.markRead(id);
    router.push(route as Href);
  };

  const handleToggleExpand = (id: string) => {
    notificationCenter.markRead(id);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const showOptInBanner = state.permission !== 'granted';

  return (
    <Screen edges={['top']}>
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
            ? `Новых уведомлений: ${state.unreadCount}`
            : 'Важные события, обновления и полезные приёмы'
        }
        title="Уведомления"
      />

      <SegmentedTabs
        activeIndex={tabIndex}
        onTabChange={setTabIndex}
        tabs={TAB_LABELS}
      />

      {showOptInBanner && tab !== 'settings' ? (
        <Card outlined style={styles.optInCard} tone="raised">
          <View style={styles.optInHeader}>
            <View style={styles.iconWrap}>
              <AppIcon color={colors.primary} name="bellBadge" size={20} />
            </View>
            <View style={styles.titleTextWrap}>
              <Text style={textStyles.titleSmall}>Уведомления на Android без спама</Text>
              <Text style={textStyles.bodySmall}>
                Сообщим только по делу: когда пачка работ класса проверена целиком, оценки требуют повторной отправки или найдена сложная тема.
              </Text>
            </View>
          </View>
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
                ? 'Открыть настройки уведомлений Android'
                : 'Включить уведомления'
            }
          />
        </Card>
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
                  style={[styles.channelRow, idx < NOTIFICATION_CHANNELS.length - 1 && styles.divider]}
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
        <View style={styles.feedStack}>
          {visibleItems.map((item) => (
            <FeedCard
              expanded={expandedId === item.id}
              item={item}
              key={item.id}
              onDismiss={() => notificationCenter.dismiss(item.id)}
              onNavigate={(route) => handleOpenRoute(item.id, route)}
              onToggleExpand={() => handleToggleExpand(item.id)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: spacing.xxs,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
  },
  bodyText: {
    color: colors.text,
    lineHeight: 20,
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  dismissBtn: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  divider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  expandedWrap: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  feedCard: {
    gap: spacing.sm,
  },
  feedCardUnread: {
    borderColor: colors.primaryDeep,
    gap: spacing.sm,
  },
  feedStack: {
    gap: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  listCard: {
    gap: spacing.xxs,
  },
  optInCard: {
    gap: spacing.md,
  },
  optInHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
  primaryChip: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    minHeight: Math.max(40, touchTarget - 8),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  primaryChipLabel: {
    ...textStyles.caption,
    color: colors.toastText,
    fontFamily: fontFamilies.semibold,
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
  secondaryChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.divider,
    borderRadius: radius.pill,
    borderWidth: hairline,
    flexDirection: 'row',
    minHeight: Math.max(40, touchTarget - 8),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  secondaryChipLabel: {
    ...textStyles.caption,
    color: colors.text,
    fontFamily: fontFamilies.medium,
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
  summaryText: {
    marginTop: 2,
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
  titlePressable: {
    gap: spacing.sm,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  titleTextWrap: {
    flex: 1,
    gap: 2,
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
