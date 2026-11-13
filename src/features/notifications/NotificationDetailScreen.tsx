import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  Button,
  EmptyState,
  Screen,
  StatusPill,
  colors,
  fontFamilies,
  fontSizes,
  hairline,
  radius,
  spacing,
  textStyles,
  touchTarget,
} from '@/design-system';
import {
  formatArticleFullDate,
  parseArticleContent,
  type ArticleBlock,
} from '@/domain/notifications/article';
import type { FeedViewItem } from '@/domain/notifications/feed';

import { notificationCenter, useNotificationCenter } from './notificationCenter';
import { iconFor, pillToneFor } from './notificationVisuals';

function ArticleBlockView({ block }: { block: ArticleBlock }) {
  switch (block.kind) {
    case 'heading':
      return (
        <Text accessibilityRole="header" selectable style={styles.sectionHeading}>
          {block.text}
        </Text>
      );

    case 'paragraph':
      return (
        <Text selectable style={styles.paragraph}>
          {block.text}
        </Text>
      );

    case 'bullets':
      return (
        <View style={styles.listStack}>
          {block.items.map((entry, idx) => (
            <View key={`${idx}-${entry.slice(0, 16)}`} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text selectable style={styles.listItemText}>
                {entry}
              </Text>
            </View>
          ))}
        </View>
      );

    case 'steps':
      return (
        <View style={styles.listStack}>
          {block.items.map((entry, idx) => (
            <View key={`${idx}-${entry.slice(0, 16)}`} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{idx + 1}</Text>
              </View>
              <Text selectable style={styles.listItemText}>
                {entry}
              </Text>
            </View>
          ))}
        </View>
      );

    case 'callout':
      return (
        <View style={styles.calloutBox}>
          <View style={styles.calloutIcon}>
            <AppIcon color={colors.primary} name="insight" size={18} />
          </View>
          <Text selectable style={styles.calloutText}>
            {block.text}
          </Text>
        </View>
      );
  }
}

export function NotificationArticleView({
  item,
  onBack,
  onDismiss,
  onNavigate,
}: {
  item: FeedViewItem;
  onBack: () => void;
  onDismiss: () => void;
  onNavigate: (target: string) => void;
}) {
  const parsed = parseArticleContent(item.summary, item.body);
  const fullDate = formatArticleFullDate(item.createdAt);

  // Skip self-links back to /notifications since the teacher is already reading the full item.
  const primaryRoute =
    item.route && item.route !== '/notifications' ? item.route : undefined;
  const primaryLabel = primaryRoute ? item.actionLabel : undefined;

  const secondaryRoute =
    item.secondaryRoute && item.secondaryRoute !== '/notifications'
      ? item.secondaryRoute
      : undefined;
  const secondaryLabel = secondaryRoute ? item.secondaryActionLabel : undefined;

  const footer =
    primaryLabel || secondaryLabel ? (
      <View style={styles.footerActions}>
        {primaryLabel && primaryRoute ? (
          <Button onPress={() => onNavigate(primaryRoute)} title={primaryLabel} />
        ) : null}
        {secondaryLabel && secondaryRoute ? (
          <Button
            onPress={() => onNavigate(secondaryRoute)}
            title={secondaryLabel}
            variant="secondary"
          />
        ) : null}
      </View>
    ) : undefined;

  const topBar = (
    <View style={styles.topNavRow}>
      <Pressable
        accessibilityLabel="Назад"
        accessibilityRole="button"
        android_ripple={{ borderless: true, color: 'rgba(244, 248, 245, 0.12)' }}
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
      >
        <AppIcon color={colors.text} name="arrowBack" size={22} />
      </Pressable>

      <Pressable
        accessibilityLabel="Скрыть из ленты"
        accessibilityRole="button"
        onPress={onDismiss}
        style={({ pressed }) => [styles.hideBtn, pressed && styles.pressed]}
      >
        <Text style={styles.hideBtnText}>Скрыть</Text>
      </Pressable>
    </View>
  );

  return (
    <Screen
      contentStyle={styles.articleScroll}
      edges={['top', 'bottom']}
      footer={footer}
      header={topBar}
    >
      <View style={styles.headerBlock}>
        <View style={styles.metaRow}>
          <StatusPill
            icon={iconFor(item.icon)}
            label={item.badge}
            tone={pillToneFor(item.tone)}
          />
          <Text style={styles.metaText}>
            {fullDate ? `${fullDate} · ${parsed.readTimeLabel}` : parsed.readTimeLabel}
          </Text>
        </View>

        <Text accessibilityRole="header" selectable style={styles.headline}>
          {item.title}
        </Text>

        {parsed.lead ? (
          <View style={styles.leadWrap}>
            <Text selectable style={styles.leadText}>
              {parsed.lead}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.bodyStack}>
        {parsed.blocks.map((block, index) => (
          <ArticleBlockView block={block} key={`${block.kind}-${index}`} />
        ))}
      </View>
    </Screen>
  );
}

export function NotificationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof rawId === 'string' ? rawId : '';

  const state = useNotificationCenter();
  const item = state.items.find((entry) => entry.id === id);

  useEffect(() => {
    if (item?.id) {
      notificationCenter.markRead(item.id);
    }
  }, [item?.id]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/notifications');
    }
  };

  if (!item) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.topNavRow}>
          <Pressable
            accessibilityLabel="Назад к уведомлениям"
            accessibilityRole="button"
            onPress={goBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <AppIcon color={colors.text} name="arrowBack" size={22} />
          </Pressable>
        </View>
        <EmptyState
          actionLabel="Ко всем уведомлениям"
          body="Возможно, эта запись была скрыта или срок её публикации завершился."
          icon="bell"
          onAction={() => router.replace('/notifications')}
          title="Материал не найден"
        />
      </Screen>
    );
  }

  return (
    <NotificationArticleView
      item={item}
      onBack={goBack}
      onDismiss={() => {
        notificationCenter.dismiss(item.id);
        goBack();
      }}
      onNavigate={(target) => {
        notificationCenter.openTarget(item.id, target, (internal) => {
          router.push(internal as Href);
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  articleScroll: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  backBtn: {
    alignItems: 'center',
    borderRadius: touchTarget / 2,
    height: touchTarget,
    justifyContent: 'center',
    marginLeft: -spacing.sm,
    width: touchTarget,
  },
  bodyStack: {
    gap: spacing.md,
  },
  bulletDot: {
    backgroundColor: colors.primary,
    borderRadius: 3,
    height: 6,
    marginTop: 9,
    width: 6,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  calloutBox: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    borderWidth: hairline,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxs,
    padding: spacing.md,
  },
  calloutIcon: {
    marginTop: 2,
  },
  calloutText: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  divider: {
    backgroundColor: colors.divider,
    height: hairline,
  },
  footerActions: {
    gap: spacing.xs,
  },
  headerBlock: {
    gap: spacing.sm,
  },
  headline: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 31,
  },
  hideBtn: {
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xs,
  },
  hideBtnText: {
    ...textStyles.bodySmall,
    color: colors.textFaint,
    fontFamily: fontFamilies.medium,
  },
  leadText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.body,
    lineHeight: 24,
  },
  leadWrap: {
    borderLeftColor: colors.primary,
    borderLeftWidth: 3,
    marginTop: spacing.xxs,
    paddingLeft: spacing.md,
  },
  listItemText: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: 15.5,
    lineHeight: 24,
  },
  listStack: {
    gap: spacing.sm,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaText: {
    ...textStyles.caption,
    color: colors.textFaint,
  },
  paragraph: {
    color: colors.text,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    lineHeight: 25,
  },
  pressed: {
    opacity: 0.78,
  },
  sectionHeading: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.titleSmall,
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginTop: 1,
    width: 24,
  },
  stepBadgeText: {
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.caption,
  },
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  topNavRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.xs,
  },
});
