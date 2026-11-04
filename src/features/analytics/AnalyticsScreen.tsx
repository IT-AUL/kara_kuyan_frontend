import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import {
  AccuracyBar,
  AppIcon,
  Button,
  Card,
  colors,
  EmptyState,
  fontFamilies,
  fontSizes,
  HeroCard,
  MiniBars,
  Notice,
  radius,
  Screen,
  ScreenHeader,
  SectionHeader,
  spacing,
  Tag,
  textStyles,
  touchTarget,
  zoneColor,
} from '@/design-system';

import { useClassInsights } from './data';

type ActionItem = {
  key: string;
  title: string;
  subtitle: string;
  barColor: string;
  onPress?: () => void;
};

export function AnalyticsScreen() {
  const router = useRouter();
  const ctx = useActiveContext();
  const insights = useClassInsights(ctx.classId);
  const { analytics, assignments, trend, status } = insights;

  const latestAssignment = assignments[0] ?? null;

  const actionItems: ActionItem[] = [];

  const worstTopic = [...(analytics?.topMistakes ?? [])]
    .filter((t) => t.affectedStudents > 0)
    .sort((a, b) => b.failureRatePct - a.failureRatePct)[0];

  if (worstTopic && analytics) {
    const topicAccuracy = Math.max(0, Math.min(100, 100 - worstTopic.failureRatePct));
    actionItems.push({
      key: `topic-${worstTopic.topicCode}`,
      title: worstTopic.topicName,
      subtitle: `Ошибка у ${worstTopic.affectedStudents} из ${analytics.studentsCount}`,
      barColor: zoneColor(topicAccuracy),
      onPress: latestAssignment
        ? () =>
            router.push({
              pathname: '/analytics-test',
              params: { id: latestAssignment.assignmentId },
            })
        : undefined,
    });
  }

  const strugglingStudents = (analytics?.students ?? []).filter((s) => s.averageScorePct < 50);
  if (strugglingStudents.length > 0) {
    const firstStruggling = strugglingStudents[0];
    actionItems.push({
      key: 'students-below-50',
      title: `${strugglingStudents.length} учеников ниже 50%`,
      subtitle: strugglingStudents
        .slice(0, 2)
        .map((s) => s.fullName)
        .join(', '),
      barColor: colors.zoneBad,
      onPress: firstStruggling
        ? () =>
            router.push({
              pathname: '/analytics-student',
              params: { id: firstStruggling.studentId },
            })
        : undefined,
    });
  }

  if (latestAssignment) {
    actionItems.push({
      key: `latest-${latestAssignment.assignmentId}`,
      title: `Итоги «${latestAssignment.title}» готовы`,
      subtitle: `Средний результат ${Math.round(latestAssignment.averageScorePct)}%`,
      barColor: colors.zoneOk,
      onPress: () =>
        router.push({
          pathname: '/analytics-test',
          params: { id: latestAssignment.assignmentId },
        }),
    });
  }

  const sortedTopics = [...(analytics?.topMistakes ?? [])]
    .map((t) => ({
      ...t,
      accuracyPct: Math.max(0, Math.min(100, 100 - t.failureRatePct)),
    }))
    .sort((a, b) => a.accuracyPct - b.accuracyPct);

  return (
    <Screen
      footer={
        <Button
          icon="export"
          onPress={() => router.push('/export-gradebook')}
          title="Экспортировать ведомость"
          variant="secondary"
        />
      }
    >
      <ScreenHeader subtitle={ctx.className ?? undefined} title="Аналитика" />

      {status === 'offline' ? (
        <Notice message="Нет связи: показаны сохранённые данные" />
      ) : null}
      {status === 'error' ? (
        <Notice
          actionLabel="Повторить"
          message="Не удалось загрузить аналитику."
          onAction={() => void insights.refresh()}
          tone="error"
        />
      ) : null}

      {!ctx.classId ? (
        <EmptyState
          body="Добавьте класс и проверьте первую работу, чтобы увидеть разбор ошибок и динамику."
          icon="analytics"
          title="Создайте класс, чтобы увидеть аналитику"
        />
      ) : (
        <>
          <HeroCard>
            <View style={styles.heroContent}>
              <Tag icon="insight" label="Что важно сейчас" tone="ok" />
              {actionItems.length === 0 ? (
                <Text style={textStyles.bodySmall}>
                  Пока мало данных: проверьте хотя бы одну работу
                </Text>
              ) : (
                <View style={styles.actionList}>
                  {actionItems.map((item) => (
                    <Pressable
                      accessibilityLabel={`${item.title}. ${item.subtitle}`}
                      accessibilityRole="button"
                      disabled={!item.onPress}
                      key={item.key}
                      onPress={item.onPress}
                      style={({ pressed }) => [
                        styles.actionRow,
                        pressed && item.onPress && styles.pressed,
                      ]}
                    >
                      <View
                        style={[styles.zoneBar, { backgroundColor: item.barColor }]}
                      />
                      <View style={styles.actionCopy}>
                        <Text style={styles.actionTitle}>{item.title}</Text>
                        <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
                      </View>
                      <View style={styles.chevronCircle}>
                        <AppIcon color={colors.text} name="chevronRight" size={18} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </HeroCard>

          <View style={styles.quickGrid}>
            <Pressable
              accessibilityLabel="Татарские буквы: ә ө ү җ ң һ"
              accessibilityRole="button"
              onPress={() => router.push('/analytics-letters')}
              style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
            >
              <Card style={styles.quickCard}>
                <Text style={styles.quickGlyph}>ә ө ү</Text>
                <Text style={styles.quickLabel}>Буквы и почерк</Text>
              </Card>
            </Pressable>
            <Pressable
              accessibilityLabel="Карта класса: матрица ответов"
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  latestAssignment
                    ? { pathname: '/analytics-map', params: { id: latestAssignment.assignmentId } }
                    : '/analytics-map',
                )
              }
              style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
            >
              <Card style={styles.quickCard}>
                <AppIcon color={colors.primary} name="classes" size={22} />
                <Text style={styles.quickLabel}>Карта класса</Text>
              </Card>
            </Pressable>
            <Pressable
              accessibilityLabel="Отчёт завучу"
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  latestAssignment
                    ? {
                        pathname: '/analytics-report',
                        params: { id: latestAssignment.assignmentId },
                      }
                    : '/analytics-report',
                )
              }
              style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
            >
              <Card style={styles.quickCard}>
                <AppIcon color={colors.primary} name="assignment" size={22} />
                <Text style={styles.quickLabel}>Отчёт завучу</Text>
              </Card>
            </Pressable>
          </View>

          {assignments.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Работы класса" />
              <View style={styles.listGap}>
                {assignments.slice(0, 5).map((item) => {
                  const score = Math.round(item.averageScorePct);
                  const scoreColor = zoneColor(item.averageScorePct);
                  return (
                    <Pressable
                      accessibilityLabel={`${item.title}, проверено ${item.checked} из ${item.totalStudents}, ${score}%`}
                      accessibilityRole="button"
                      key={item.id || item.assignmentId}
                      onPress={() =>
                        router.push({
                          pathname: '/analytics-test',
                          params: { id: item.assignmentId },
                        })
                      }
                      style={({ pressed }) => [pressed && styles.pressed]}
                    >
                      <Card style={styles.assignmentRow}>
                        <View style={styles.assignmentCopy}>
                          <Text style={styles.assignmentTitle}>{item.title}</Text>
                          <Text style={textStyles.caption}>
                            Проверено {item.checked} из {item.totalStudents}
                          </Text>
                        </View>
                        <Text style={[textStyles.numeric, { color: scoreColor }]}>
                          {score}%
                        </Text>
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {trend.length >= 2 ? (
            <View style={styles.section}>
              <SectionHeader title="Динамика" />
              <Card style={styles.trendCard}>
                <MiniBars height={48} values={trend} />
                <Text style={textStyles.bodySmall}>Средний результат по работам</Text>
              </Card>
            </View>
          ) : null}

          {sortedTopics.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Темы" />
              <Card style={styles.topicsCard}>
                {sortedTopics.map((topic) => (
                  <AccuracyBar
                    caption={`ошибка у ${topic.affectedStudents} уч.`}
                    key={topic.topicCode}
                    label={topic.topicName}
                    value={topic.accuracyPct}
                  />
                ))}
              </Card>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionList: {
    gap: spacing.sm,
  },
  actionRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: touchTarget,
    padding: 14,
  },
  actionSubtitle: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  actionTitle: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.bodySmall,
    lineHeight: 20,
  },
  assignmentCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  assignmentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  assignmentTitle: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.body,
    lineHeight: 22,
  },
  chevronCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  heroContent: {
    gap: spacing.md,
  },
  listGap: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  quickCard: {
    gap: spacing.xs,
    minHeight: 84,
    padding: 14,
  },
  quickGlyph: {
    color: colors.primary,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quickLabel: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    lineHeight: 17,
  },
  quickTile: {
    flex: 1,
  },
  section: {
    gap: spacing.sm,
  },
  topicsCard: {
    gap: spacing.md,
  },
  trendCard: {
    gap: spacing.sm,
  },
  zoneBar: {
    alignSelf: 'stretch',
    borderRadius: radius.pill,
    width: 8,
  },
});
