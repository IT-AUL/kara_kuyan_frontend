import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { classAnalyticsResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import {
  AppIcon,
  BottomSheet,
  Button,
  Card,
  colors,
  EmptyState,
  Notice,
  Screen,
  ScreenHeader,
  spacing,
  textStyles,
} from '@/design-system';
import { withAlpha } from '@/design-system/color';

import { LetterKey } from './components/LetterKey';

const TATAR_LETTERS = ['ә', 'ө', 'ү', 'җ', 'ң', 'һ'] as const;

type SelectedLetter = {
  letter: string;
  errorPct: number | null;
};

function chunkIntoRows<T>(items: readonly T[], columns: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    const slice: (T | null)[] = items.slice(i, i + columns);
    while (slice.length < columns) {
      slice.push(null);
    }
    rows.push(slice);
  }
  return rows;
}

export function LettersScreen() {
  const ctx = useActiveContext();
  const analyticsRes = useResource(
    ctx.classId ? classAnalyticsResource(ctx.classId) : null,
  );
  const [selected, setSelected] = useState<SelectedLetter | null>(null);

  const difficultLetters = useMemo(
    () => analyticsRes.data?.difficultLetters ?? [],
    [analyticsRes.data],
  );

  const tatarItems = useMemo(() => {
    const byLetter = new Map<string, number>();
    for (const item of difficultLetters) {
      byLetter.set(item.letter.toLocaleLowerCase('ru'), item.errorRatePct);
    }
    return TATAR_LETTERS.map((letter) => ({
      letter,
      errorPct: byLetter.get(letter) ?? null,
    }));
  }, [difficultLetters]);

  const restItems = useMemo(() => {
    const tatarSet = new Set<string>(TATAR_LETTERS);
    return difficultLetters
      .filter((item) => !tatarSet.has(item.letter.toLocaleLowerCase('ru')))
      .slice()
      .sort((a, b) => b.errorRatePct - a.errorRatePct)
      .map((item) => ({
        letter: item.letter,
        errorPct: item.errorRatePct,
      }));
  }, [difficultLetters]);

  const topTwoTatar = useMemo(() => {
    const sorted = tatarItems
      .map((item) => ({
        letter: item.letter,
        errorPct: item.errorPct ?? 0,
      }))
      .sort((a, b) => b.errorPct - a.errorPct);
    if (sorted.length < 2) {
      return null;
    }
    const [first, second] = sorted;
    if (first.errorPct + second.errorPct <= 0) {
      return null;
    }
    return { a: first.letter, b: second.letter };
  }, [tatarItems]);

  const tatarRows = useMemo(() => chunkIntoRows(tatarItems, 3), [tatarItems]);
  const restRows = useMemo(() => chunkIntoRows(restItems, 8), [restItems]);

  const isLoading =
    Boolean(ctx.classId) &&
    (analyticsRes.status === 'loading' || analyticsRes.status === 'idle') &&
    !analyticsRes.data;

  return (
    <Screen
      onRefresh={ctx.classId ? () => void analyticsRes.refresh() : undefined}
      refreshing={analyticsRes.status === 'loading' && Boolean(analyticsRes.data)}
    >
      <ScreenHeader
        showBack
        subtitle={ctx.className ?? undefined}
        title="Буквы класса"
      />

      {analyticsRes.offline ? (
        <Notice message="Нет связи: показаны сохранённые данные" />
      ) : null}
      {analyticsRes.status === 'error' ? (
        <Notice
          actionLabel="Повторить"
          message="Не удалось загрузить аналитику."
          onAction={() => void analyticsRes.refresh()}
          tone="error"
        />
      ) : null}
      {isLoading ? (
        <Notice message="Загрузка аналитики…" tone="info" />
      ) : null}

      {!ctx.classId ? (
        <EmptyState
          body="Добавьте класс и проверьте первую работу, чтобы увидеть разбор ошибок по буквам."
          icon="analytics"
          title="Создайте класс, чтобы увидеть аналитику"
        />
      ) : (
        <>
          <View style={styles.intro}>
            <Text style={textStyles.titleSmall}>Где ошибаются в буквах</Text>
            <Text style={textStyles.caption}>
              % неверно написанных из всех встреч буквы
            </Text>
          </View>

          <Card style={styles.keyboardCard}>
            <Text style={[textStyles.eyebrow, styles.eyebrowFaint]}>
              Татарские
            </Text>
            <View style={styles.gridBig}>
              {tatarRows.map((row, rowIndex) => (
                <View key={`tat-row-${rowIndex}`} style={styles.rowBig}>
                  {row.map((cell, colIndex) =>
                    cell ? (
                      <View key={cell.letter} style={styles.cell}>
                        <LetterKey
                          big
                          errorPct={cell.errorPct}
                          letter={cell.letter}
                          onPress={() => setSelected(cell)}
                          selected={selected?.letter === cell.letter}
                        />
                      </View>
                    ) : (
                      <View
                        key={`tat-empty-${rowIndex}-${colIndex}`}
                        style={styles.cell}
                      />
                    ),
                  )}
                </View>
              ))}
            </View>

            <Text
              style={[
                textStyles.eyebrow,
                styles.eyebrowFaint,
                styles.restEyebrow,
              ]}
            >
              Остальные
            </Text>
            {restRows.length > 0 ? (
              <View style={styles.gridSmall}>
                {restRows.map((row, rowIndex) => (
                  <View key={`rest-row-${rowIndex}`} style={styles.rowSmall}>
                    {row.map((cell, colIndex) =>
                      cell ? (
                        <View
                          key={`${cell.letter}-${rowIndex}-${colIndex}`}
                          style={styles.cell}
                        >
                          <LetterKey
                            errorPct={cell.errorPct}
                            letter={cell.letter}
                            onPress={() => setSelected(cell)}
                            selected={selected?.letter === cell.letter}
                          />
                        </View>
                      ) : (
                        <View
                          key={`rest-empty-${rowIndex}-${colIndex}`}
                          style={styles.cell}
                        />
                      ),
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={textStyles.caption}>
                Нет данных по остальным буквам
              </Text>
            )}
          </Card>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.zoneBad }]}
              />
              <Text style={textStyles.caption}>≥30%</Text>
            </View>
            <Text style={textStyles.caption}>·</Text>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.zoneMid }]}
              />
              <Text style={textStyles.caption}>15–30%</Text>
            </View>
            <Text style={textStyles.caption}>·</Text>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: withAlpha(colors.zoneMid, 0.7) },
                ]}
              />
              <Text style={textStyles.caption}>меньше 15%</Text>
            </View>
          </View>

          {topTwoTatar ? (
            <Card style={styles.insightCard}>
              <AppIcon color={colors.primary} name="insight" size={20} />
              <Text style={[textStyles.bodySmall, styles.insightText]}>
                Больше всего ошибок в буквах «{topTwoTatar.a}» и «
                {topTwoTatar.b}». Короткий диктант на них закроет большую часть
                проблемы.
              </Text>
            </Card>
          ) : null}
        </>
      )}

      <BottomSheet
        onClose={() => setSelected(null)}
        title={selected ? `Буква «${selected.letter}»` : undefined}
        visible={selected !== null}
      >
        {selected ? (
          <View style={styles.sheetContent}>
            <Text style={textStyles.title}>
              Ошибка в {Math.round(selected.errorPct ?? 0)}%
            </Text>
            <Text style={textStyles.caption}>
              С какими буквами путают — видно в профиле ученика
            </Text>
            <Button
              onPress={() => setSelected(null)}
              title="Закрыть"
              variant="secondary"
            />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
  },
  eyebrowFaint: {
    color: colors.textFaint,
  },
  gridBig: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  gridSmall: {
    gap: 6,
    marginTop: spacing.sm,
  },
  insightCard: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  insightText: {
    color: colors.text,
    flex: 1,
  },
  intro: {
    gap: spacing.xxs,
  },
  keyboardCard: {
    gap: spacing.xxs,
  },
  legendDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  restEyebrow: {
    marginTop: spacing.lg,
  },
  rowBig: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rowSmall: {
    flexDirection: 'row',
    gap: 6,
  },
  sheetContent: {
    gap: spacing.md,
  },
});
