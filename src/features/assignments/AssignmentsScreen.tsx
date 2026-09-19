import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { useHiddenTests } from '@/data/hiddenTests';
import { useTestDraft } from '@/data/testDraft';
import { AppIcon, Button, Chips, EmptyState, GlowLayer, Notice, ProgressBar, Screen, ScreenHeader, SearchBar, StatusPill, textStyles } from '@/design-system';
import { withAlpha } from '@/design-system/color';
import { colors, hairline, radius, spacing } from '@/design-system/tokens';

import { TestCard } from './components/TestCard';

/**
 * Tests: what the teacher checks now and what the teacher builds. The bank of tasks lives inside the
 * constructor (a task is a part of a test); choosing the current test happens here and on the test page.
 */
export function AssignmentsScreen() {
  const router = useRouter();
  const ctx = useActiveContext();
  const draft = useTestDraft();
  const hidden = useHiddenTests();
  const [query, setQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);

  const q = query.trim().toLowerCase();
  const visible = ctx.tests.filter((t) => hidden.includes(t.testId) === showHidden && t.title.toLowerCase().includes(q));
  const current = ctx.tests.find((t) => t.testId === ctx.assignmentId);
  const hiddenCount = ctx.tests.filter((t) => hidden.includes(t.testId)).length;
  const hasDraft = draft.tasks.length > 0 || draft.title.trim().length > 0;
  const open = (id: string) => router.push({ pathname: '/test-detail', params: { id } });
  const others = visible.filter((t) => t.testId !== ctx.assignmentId || showHidden);

  return (
    <Screen
      edges={['top']}
      footer={<Button icon="add" onPress={() => router.push('/test-form')} title={hasDraft ? 'Продолжить черновик' : 'Создать тест'} />}
      onRefresh={() => void ctx.testsState.refresh()}
      refreshing={ctx.testsState.status === 'loading'}
    >
      <ScreenHeader subtitle={ctx.tests.length > 0 ? `Всего: ${ctx.tests.length - hiddenCount}` : undefined} title="Тесты" />

      {ctx.testsState.offline ? <Notice message="Нет связи: показаны сохранённые тесты." /> : null}

      {current && ctx.classId && !showHidden ? (
        <Pressable
          accessibilityHint="Открывает страницу теста: итоги, задания, ученики, бланк"
          accessibilityLabel={`${current.title}. Сейчас проверяем. Проверено ${ctx.progress.checkedCount} из ${ctx.progress.studentCount}`}
          accessibilityRole="button"
          onPress={() => open(current.testId)}
          style={styles.hero}
        >
          <GlowLayer color={colors.primary} size={240} style={styles.glow} />
          <StatusPill icon="scan" label="Сейчас проверяем" tone="info" />
          <Text numberOfLines={2} style={textStyles.title}>{current.title}</Text>
          <Text style={textStyles.bodySmall}>{ctx.className} · проверено {ctx.progress.checkedCount} из {ctx.progress.studentCount}</Text>
          <ProgressBar percent={ctx.progress.percent} />
          <View style={styles.more}>
            <Text style={styles.moreText}>Итоги, задания, ученики, бланк</Text>
            <AppIcon color={colors.primary} name="chevronRight" size={18} />
          </View>
        </Pressable>
      ) : null}

      {hasDraft && !showHidden ? (
        <Pressable accessibilityLabel={`Черновик: ${draft.title.trim() || 'без названия'}`} accessibilityRole="button" android_ripple={{ color: 'rgba(244, 248, 245, 0.08)' }} onPress={() => router.push('/test-form')} style={styles.draft}>
          <AppIcon color={colors.warning} name="edit" size={22} />
          <View style={styles.grow}>
            <Text numberOfLines={1} style={styles.draftTitle}>{draft.title.trim() || 'Без названия'}</Text>
            <Text style={textStyles.caption}>Черновик · {draft.tasks.length} заданий</Text>
          </View>
          <AppIcon color={colors.textFaint} name="chevronRight" size={20} />
        </Pressable>
      ) : null}

      {hiddenCount > 0 ? (
        <Chips
          items={[{ key: 'hidden', label: `Скрытые · ${hiddenCount}` }]}
          allLabel="Все тесты"
          onSelect={(key) => setShowHidden(key === 'hidden')}
          selected={showHidden ? 'hidden' : null}
        />
      ) : null}
      {ctx.tests.length > 6 ? <SearchBar onChangeText={setQuery} placeholder="Поиск по названию" value={query} /> : null}

      {ctx.tests.length === 0 ? (
        <EmptyState actionLabel="Создать тест" body="Соберите тест из банка заданий или сгенерируйте: бланк для печати создаст сервер." icon="library" onAction={() => router.push('/test-form')} title="Пока нет тестов" />
      ) : others.length === 0 ? (
        <Text style={textStyles.bodySmall}>{showHidden ? 'Скрытых тестов нет.' : 'Других тестов нет.'}</Text>
      ) : (
        <View style={styles.list}>
          {others.map((t) => (
            <TestCard
              current={t.testId === ctx.assignmentId}
              gradeLevel={t.gradeLevel}
              key={t.testId}
              muted={showHidden}
              onPress={() => open(t.testId)}
              taskCount={t.questionsCount}
              title={t.title}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  draft: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.warning, 0.07),
    borderColor: withAlpha(colors.warning, 0.45),
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 64,
    padding: spacing.md,
  },
  draftTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  glow: { right: -80, top: -100 },
  grow: { flex: 1 },
  hero: { backgroundColor: colors.surface, borderColor: colors.divider, borderRadius: radius.xl, borderWidth: hairline, gap: spacing.sm, overflow: 'hidden', padding: spacing.lg },
  list: { gap: spacing.xs },
  more: { alignItems: 'center', flexDirection: 'row', gap: 2, minHeight: 32 },
  moreText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});
