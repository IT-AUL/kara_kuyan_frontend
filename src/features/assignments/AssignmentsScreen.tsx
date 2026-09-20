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

const dueLabel = (iso: string | null): string | undefined => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

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
  const [chosenView, setChosenView] = useState<'class' | 'all' | 'hidden' | null>(null);

  const q = query.trim().toLowerCase();
  const current = ctx.tests.find((t) => t.testId === ctx.assignmentId);
  const hiddenCount = ctx.tests.filter((t) => hidden.includes(t.testId)).length;
  const hasDraft = draft.tasks.length > 0 || draft.title.trim().length > 0;
  const open = (id: string) => router.push({ pathname: '/test-detail', params: { id } });
  const serverByTest = new Map(ctx.classAssignments.map((a) => [a.assignmentId, a]));
  // the server's per-class list is authoritative; the test list's `assigned_classes` is the fallback
  const assignedHere = (t: { testId: string; assignedClasses?: string[] }) =>
    serverByTest.has(t.testId) || (!!ctx.classId && !!t.assignedClasses?.includes(ctx.classId));
  const notHidden = ctx.tests.filter((t) => !hidden.includes(t.testId));
  const assignedCount = notHidden.filter(assignedHere).length;
  // by default show what belongs to the class; everything else (the server's list is shared) is one chip away
  const view = chosenView === 'hidden' && hiddenCount === 0 ? null : (chosenView ?? (assignedCount > 0 ? 'class' : 'all'));
  const showHidden = view === 'hidden';
  const pool = view === 'hidden' ? ctx.tests.filter((t) => hidden.includes(t.testId)) : view === 'class' ? notHidden.filter(assignedHere) : notHidden;
  const others = pool.filter((t) => (t.testId !== ctx.assignmentId || showHidden) && t.title.toLowerCase().includes(q));
  /** The current test shows local progress (it includes sheets not yet sent); others show the server's numbers. */
  const progressFor = (id: string) => {
    if (id === ctx.assignmentId) return { checked: ctx.progress.checkedCount, total: ctx.progress.studentCount, averagePct: null };
    const a = serverByTest.get(id);
    return a ? { checked: a.checked, total: a.totalStudents, averagePct: Math.round(a.averageScorePct) } : undefined;
  };
  const card = (t: (typeof others)[number]) => (
    <TestCard
      current={t.testId === ctx.assignmentId}
      gradeLevel={t.gradeLevel}
      key={t.testId}
      muted={showHidden}
      due={dueLabel(serverByTest.get(t.testId)?.dueDate ?? null)}
      onPress={() => open(t.testId)}
      progress={progressFor(t.testId)}
      taskCount={t.questionsCount}
      title={t.title}
    />
  );

  return (
    <Screen
      edges={['top']}
      footer={<Button icon="add" onPress={() => router.push('/test-form')} title={hasDraft ? 'Продолжить черновик' : 'Создать тест'} />}
      onRefresh={() => void ctx.testsState.refresh()}
      refreshing={ctx.testsState.status === 'loading'}
    >
      <ScreenHeader subtitle={ctx.tests.length > 0 ? `Всего: ${ctx.tests.length - hiddenCount}` : undefined} title="Тесты" />

      {ctx.testsState.offline ? <Notice message="Нет связи: показаны сохранённые тесты." /> : null}

      {current && ctx.classId && view !== 'hidden' ? (
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

      {hasDraft && view !== 'hidden' ? (
        <Pressable accessibilityLabel={`Черновик: ${draft.title.trim() || 'без названия'}`} accessibilityRole="button" android_ripple={{ color: 'rgba(244, 248, 245, 0.08)' }} onPress={() => router.push('/test-form')} style={styles.draft}>
          <AppIcon color={colors.warning} name="edit" size={22} />
          <View style={styles.grow}>
            <Text numberOfLines={1} style={styles.draftTitle}>{draft.title.trim() || 'Без названия'}</Text>
            <Text style={textStyles.caption}>Черновик · {draft.tasks.length} заданий</Text>
          </View>
          <AppIcon color={colors.textFaint} name="chevronRight" size={20} />
        </Pressable>
      ) : null}

      {assignedCount > 0 || hiddenCount > 0 ? (
        <Chips
          items={[
            ...(assignedCount > 0 ? [{ key: 'class', label: `Класса ${ctx.className} · ${assignedCount}` }] : []),
            { key: 'all', label: `Все · ${notHidden.length}` },
            ...(hiddenCount > 0 ? [{ key: 'hidden', label: `Скрытые · ${hiddenCount}` }] : []),
          ]}
          onSelect={(key) => setChosenView((key as 'class' | 'all' | 'hidden' | null) ?? 'all')}
          selected={view}
        />
      ) : null}
      {ctx.tests.length > 6 ? <SearchBar onChangeText={setQuery} placeholder="Поиск по названию" value={query} /> : null}

      {ctx.tests.length === 0 ? (
        <EmptyState actionLabel="Создать тест" body="Соберите тест из банка заданий или сгенерируйте: бланк для печати создаст сервер." icon="library" onAction={() => router.push('/test-form')} title="Пока нет тестов" />
      ) : others.length === 0 ? (
        <Text style={textStyles.bodySmall}>{showHidden ? 'Скрытых тестов нет.' : view === 'class' ? 'Других тестов у этого класса нет. Откройте «Все», чтобы назначить.' : 'Других тестов нет.'}</Text>
      ) : (
        <View style={styles.list}>
          {others.map(card)}
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
