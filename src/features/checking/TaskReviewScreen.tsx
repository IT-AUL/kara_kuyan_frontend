import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  cellFixKey,
  effectiveStatus,
  resolveTaskWithFixes,
  type EvaluatedTask,
} from '@/domain/scan/evaluate';
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
import { TatarLetterPickerSheet } from './components/TatarLetterPickerSheet';
import { scanSession, useScanSession } from './scanSession';

type UndoAction =
  | { kind: 'task'; number: number; message: string }
  | { kind: 'cell'; taskNumber: number; cellIndex: number; message: string };

export function TaskReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ task?: string }>();
  const requestedTaskNumber = params.task ? Number.parseInt(params.task, 10) : NaN;

  const { outcome, overrides, cellFixes } = useScanSession();
  const [revisit, setRevisit] = useState<number | null>(
    Number.isFinite(requestedTaskNumber) ? requestedTaskNumber : null,
  );
  const [manualCell, setManualCell] = useState<{ taskNumber: number; cellIndex: number } | null>(
    null,
  );
  const [pickerCellIndex, setPickerCellIndex] = useState<number | null>(null);
  const [last, setLast] = useState<UndoAction | null>(null);

  useEffect(() => {
    if (!last) return;
    const timer = setTimeout(() => {
      setLast(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [last]);

  const reviewTasks = useMemo<readonly EvaluatedTask[]>(() => {
    if (!outcome) return [];
    const base = outcome.tasks.filter((t) => t.status === 'review');
    if (Number.isFinite(requestedTaskNumber) && !base.some((t) => t.number === requestedTaskNumber)) {
      const extra = outcome.tasks.find((t) => t.number === requestedTaskNumber);
      return extra ? [...base, extra] : base;
    }
    return base;
  }, [outcome, requestedTaskNumber]);

  const isTaskDecided = (task: EvaluatedTask): boolean =>
    effectiveStatus(task, overrides[task.number], cellFixes) !== 'review';

  const rawCurrent =
    revisit !== null
      ? reviewTasks.find((t) => t.number === revisit)
      : reviewTasks.find((t) => !isTaskDecided(t));

  const current = rawCurrent ? resolveTaskWithFixes(rawCurrent, cellFixes) : undefined;

  const selectedCellIndex = useMemo<number | null>(() => {
    if (!current) return null;
    if (
      manualCell &&
      manualCell.taskNumber === current.number &&
      current.cells.some((c) => c.index === manualCell.cellIndex)
    ) {
      return manualCell.cellIndex;
    }
    const firstUncertain = current.cells.find((c) => c.verdict === 'uncertain');
    const firstDiff = current.cells.find((c) => c.verdict !== 'match');
    return (firstUncertain ?? firstDiff ?? current.cells[0])?.index ?? 0;
  }, [current, manualCell]);

  const currentIndex = current ? reviewTasks.findIndex((t) => t.number === current.number) : -1;
  const decidedCount = reviewTasks.filter((t) => isTaskDecided(t)).length;
  const position = currentIndex >= 0 ? currentIndex + 1 : decidedCount + 1;

  let acceptCount = 0;
  let rejectCount = 0;
  for (const t of reviewTasks) {
    const st = effectiveStatus(t, overrides[t.number], cellFixes);
    if (st === 'correct') acceptCount += 1;
    else if (st === 'error' || st === 'missing') rejectCount += 1;
  }

  const decideWholeTask = (verdict: 'accept' | 'reject') => {
    if (!current) return;
    const isLast = reviewTasks.every((t) => t.number === current.number || isTaskDecided(t));
    scanSession.override(current.number, verdict);
    if (isLast) {
      router.replace('/assessment-result');
      return;
    }
    setLast({
      kind: 'task',
      number: current.number,
      message: verdict === 'accept' ? 'Засчитано целиком' : 'Отмечено как ошибка',
    });
    setRevisit(null);
    setManualCell(null);
  };

  const handlePickChar = (cellIndex: number, char: string) => {
    if (!rawCurrent || !current) return;
    const nextFixes = {
      ...cellFixes,
      [cellFixKey(rawCurrent.number, cellIndex)]: char,
    };
    const nextOverrides = { ...overrides };
    delete nextOverrides[rawCurrent.number];
    const nextResolved = resolveTaskWithFixes(rawCurrent, nextFixes);

    scanSession.fixCell(rawCurrent.number, cellIndex, char);

    const remainingUncertain = nextResolved.cells.find(
      (c) => c.verdict === 'uncertain' && c.index !== cellIndex,
    );

    if (remainingUncertain) {
      setManualCell({ taskNumber: rawCurrent.number, cellIndex: remainingUncertain.index });
      setLast({
        kind: 'cell',
        taskNumber: rawCurrent.number,
        cellIndex,
        message: `Ячейка ${cellIndex + 1}: «${char.trim() === '' ? 'пусто' : char}»`,
      });
      return;
    }

    const allOthersDone = reviewTasks
      .filter((t) => t.number !== rawCurrent.number)
      .every((t) => effectiveStatus(t, nextOverrides[t.number], nextFixes) !== 'review');

    if (nextResolved.status !== 'review' && allOthersDone) {
      router.replace('/assessment-result');
      return;
    }

    setLast({
      kind: 'cell',
      taskNumber: rawCurrent.number,
      cellIndex,
      message:
        nextResolved.status === 'correct'
          ? 'Слово совпало — засчитано'
          : 'Буква уточнена — зафиксирована ошибка',
    });
    if (nextResolved.status !== 'review') {
      setRevisit(null);
      setManualCell(null);
    }
  };

  const handleUndo = () => {
    if (!last) return;
    if (last.kind === 'cell') {
      scanSession.clearCellFix(last.taskNumber, last.cellIndex);
      setRevisit(last.taskNumber);
      setManualCell({ taskNumber: last.taskNumber, cellIndex: last.cellIndex });
    } else {
      scanSession.clearOverride(last.number);
      setRevisit(last.number);
      setManualCell(null);
    }
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
          eyebrow="Точечный фокус"
          subtitle="Жёлтых спорных ячеек на этом листе больше нет."
          title="Всё проверено"
        />
      </Screen>
    );
  }

  const pickerCell =
    pickerCellIndex !== null ? current.cells.find((c) => c.index === pickerCellIndex) : undefined;

  return (
    <View style={styles.root}>
      <Screen
        footer={
          <View style={styles.actions}>
            <View style={styles.actionSlot}>
              <Button
                icon="close"
                onPress={() => decideWholeTask('reject')}
                title="Ошибка"
                variant="danger"
              />
            </View>
            <View style={styles.actionSlot}>
              <Button icon="check" onPress={() => decideWholeTask('accept')} title="Верно" />
            </View>
          </View>
        }
      >
        <ScreenHeader showBack title={`Точечная проверка · ${position} из ${reviewTasks.length}`} />

        <View style={styles.progressRow}>
          <Tag icon="close" label={String(rejectCount)} tone="bad" />
          <View
            accessibilityLabel={`Задание ${position} из ${reviewTasks.length}`}
            style={styles.dots}
          >
            {reviewTasks.map((t) => {
              const isCurrent = t.number === current.number;
              const isDecided = isTaskDecided(t);
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
          cells={current.cells}
          expected={current.expected}
          key={current.number}
          onDecide={decideWholeTask}
          onOpenFullAlphabet={(idx) => setPickerCellIndex(idx)}
          onPickChar={handlePickChar}
          onSelectCell={(idx) => setManualCell({ taskNumber: current.number, cellIndex: idx })}
          recognized={current.recognized}
          selectedCellIndex={selectedCellIndex}
        />
      </Screen>

      <TatarLetterPickerSheet
        cellNumber={pickerCell ? pickerCell.index + 1 : undefined}
        currentChar={pickerCell?.predicted}
        expectedChar={pickerCell?.expected}
        onClose={() => setPickerCellIndex(null)}
        onSelect={(char) => {
          if (pickerCellIndex !== null) {
            handlePickChar(pickerCellIndex, char);
          }
        }}
        visible={pickerCellIndex !== null}
      />

      <Toast
        actionLabel="Отменить"
        message={last?.message ?? ''}
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
