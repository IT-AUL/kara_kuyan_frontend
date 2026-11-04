import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  colors,
  Screen,
  ScreenHeader,
  spacing,
  Tag,
  textStyles,
  Toast,
} from '@/design-system';
import { ReviewCard } from './components/ReviewCard';
import { scanSession, useScanSession } from './scanSession';

export function TaskReviewScreen() {
  const router = useRouter();
  const { outcome, overrides } = useScanSession();
  const [revisit, setRevisit] = useState<number | null>(null);
  const [last, setLast] = useState<{ number: number; verdict: 'accept' | 'reject' } | null>(null);

  useEffect(() => {
    if (!last) return;
    const timer = setTimeout(() => {
      setLast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [last]);

  const flagged = outcome?.tasks.filter((t) => t.status === 'review') ?? [];
  const current =
    revisit !== null
      ? flagged.find((t) => t.number === revisit)
      : flagged.find((t) => !overrides[t.number]);

  const currentIndex = current ? flagged.findIndex((t) => t.number === current.number) : -1;
  const position =
    currentIndex >= 0 ? currentIndex + 1 : flagged.filter((t) => overrides[t.number]).length + 1;

  const flaggedNumbers = new Set(flagged.map((t) => t.number));
  const flaggedOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([num]) => flaggedNumbers.has(Number(num))),
  );
  const verdicts = Object.values(flaggedOverrides);
  const rejectCount = verdicts.filter((v) => v === 'reject').length;
  const acceptCount = verdicts.filter((v) => v === 'accept').length;

  const decide = (verdict: 'accept' | 'reject') => {
    if (!current) return;
    const isLast = flagged.every((t) => t.number === current.number || Boolean(overrides[t.number]));
    scanSession.override(current.number, verdict);
    if (isLast) {
      router.replace('/assessment-result');
      return;
    }
    setLast({ number: current.number, verdict });
    setRevisit(null);
  };

  const handleUndo = () => {
    if (!last) return;
    setRevisit(last.number);
    setLast(null);
  };

  if (!current) {
    return (
      <Screen
        footer={
          <Button
            icon="check"
            onPress={() => router.replace('/assessment-result')}
            title="К результату"
          />
        }
      >
        <ScreenHeader
          eyebrow="Проверка ответа"
          subtitle="Отмеченных ответов больше нет."
          title="Всё проверено"
        />
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <Screen
        footer={
          <View style={styles.actions}>
            <View style={styles.actionSlot}>
              <Button
                icon="close"
                onPress={() => decide('reject')}
                title="Ошибка"
                variant="danger"
              />
            </View>
            <View style={styles.actionSlot}>
              <Button icon="check" onPress={() => decide('accept')} title="Верно" />
            </View>
          </View>
        }
      >
        <ScreenHeader showBack title={`Разбор · ${position} из ${flagged.length}`} />

        <View style={styles.progressRow}>
          <Tag icon="close" label={String(rejectCount)} tone="bad" />
          <View
            accessibilityLabel={`Задание ${position} из ${flagged.length}`}
            style={styles.dots}
          >
            {flagged.map((t) => {
              const isCurrent = t.number === current.number;
              const isDecided = Boolean(overrides[t.number]);
              return (
                <View
                  key={t.number}
                  style={[
                    styles.dot,
                    isDecided && styles.dotDecided,
                    isCurrent && styles.dotCurrent,
                  ]}
                />
              );
            })}
          </View>
          <Tag icon="check" label={String(acceptCount)} tone="ok" />
        </View>

        <View style={styles.taskHeader}>
          <Text style={textStyles.caption}>{`Задание ${current.number}`}</Text>
          <Text selectable style={textStyles.title}>
            {current.prompt}
          </Text>
        </View>

        <ReviewCard
          expected={current.expected}
          key={current.number}
          onDecide={decide}
          recognized={current.recognized}
        />
      </Screen>

      <Toast
        actionLabel="Отменить"
        message={last?.verdict === 'accept' ? 'Засчитано' : 'Отмечено как ошибка'}
        onAction={handleUndo}
        visible={last !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionSlot: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 3,
    height: 6,
    width: 8,
  },
  dotCurrent: {
    backgroundColor: colors.text,
    width: 22,
  },
  dotDecided: {
    backgroundColor: colors.primary,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  root: {
    flex: 1,
  },
  taskHeader: {
    gap: spacing.xxs,
  },
});
