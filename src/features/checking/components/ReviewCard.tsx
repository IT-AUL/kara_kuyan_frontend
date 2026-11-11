import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { EvaluatedCell } from '@/domain/scan/evaluate';
import {
  colors,
  fontFamilies,
  fontSizes,
  radius,
  spacing,
  textStyles,
} from '@/design-system';

export type ReviewCardProps = {
  expected: string;
  recognized: string;
  onDecide: (verdict: 'accept' | 'reject') => void;
  cells?: readonly EvaluatedCell[];
  selectedCellIndex?: number | null;
  onSelectCell?: (cellIndex: number) => void;
  onPickChar?: (cellIndex: number, char: string) => void;
  onOpenFullAlphabet?: (cellIndex: number) => void;
};

function withAlpha(color: string, alpha: number): string {
  const clean = color.replace(/[^0-9a-fA-F]/g, '');
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return color;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Trims trailing blank-expected & blank-predicted grid padding cells while preserving any extra student letters. */
function trimTrailingPaddingCells(cells: readonly EvaluatedCell[], minLen: number): readonly EvaluatedCell[] {
  let end = cells.length;
  while (end > minLen && end > 1) {
    const tail = cells[end - 1];
    if (
      tail &&
      tail.expected.trim() === '' &&
      tail.predicted.trim() === '' &&
      tail.verdict === 'match' &&
      !tail.fixedByTeacher
    ) {
      end -= 1;
    } else {
      break;
    }
  }
  return cells.slice(0, end);
}

function CharacterCells({
  expected,
  recognized,
  cells,
  selectedCellIndex,
  onSelectCell,
}: {
  expected: string;
  recognized: string;
  cells?: readonly EvaluatedCell[];
  selectedCellIndex?: number | null;
  onSelectCell?: (cellIndex: number) => void;
}) {
  const expectedChars = Array.from(expected);
  const recognizedChars = Array.from(recognized);

  if (!cells || cells.length === 0) {
    return (
      <View
        accessibilityLabel={`Ожидалось: ${expected}. Написано: ${recognized}`}
        style={styles.comparison}
      >
        <View style={styles.wordRow}>
          <Text style={styles.wordLabel}>Ожидалось</Text>
          <View accessibilityLabel={`Ожидалось: ${expected}`} style={styles.cells}>
            {expectedChars.map((char, index) => (
              <View key={`${char}-${index}`} style={styles.cell}>
                <Text style={styles.char}>{char}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.wordRow}>
          <Text style={styles.wordLabel}>Написано</Text>
          <View accessibilityLabel={`Написано: ${recognized}`} style={styles.cells}>
            {recognizedChars.map((char, index) => (
              <View
                accessibilityLabel={
                  char !== expectedChars[index]
                    ? `${char}, отличается от ${expectedChars[index]}`
                    : char
                }
                key={`${char}-${index}`}
                style={[styles.cell, char !== expectedChars[index] && styles.cellMismatch]}
              >
                <Text style={styles.char}>{char}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  const visibleCells = trimTrailingPaddingCells(cells, expectedChars.length);
  const wrapCells = visibleCells.length > 8;

  return (
    <View
      accessibilityLabel={`Ожидалось: ${expected}. Написано: ${recognized}`}
      style={styles.comparison}
    >
      <View style={styles.wordRow}>
        <Text style={styles.wordLabel}>Ожидалось</Text>
        <View
          accessibilityLabel={`Ожидалось: ${expected}`}
          style={[styles.cells, wrapCells && styles.cellsWrap]}
        >
          {visibleCells.map((cell) => {
            const expChar = cell.expected.trim() === '' ? '␣' : cell.expected;
            return (
              <View
                key={`exp-${cell.index}`}
                style={[styles.cell, wrapCells && styles.cellWrapped]}
              >
                <Text style={[styles.char, cell.expected.trim() === '' && styles.charBlank]}>
                  {expChar}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.wordRow}>
        <View style={styles.wordHeaderRow}>
          <Text style={styles.wordLabel}>Написано</Text>
          <Text style={styles.legendText}>Жёлтые — сомнение &lt; 85%</Text>
        </View>
        <View
          accessibilityLabel={`Написано: ${recognized}`}
          style={[styles.cells, wrapCells && styles.cellsWrap]}
        >
          {visibleCells.map((cell) => {
            const isSelected = selectedCellIndex === cell.index;
            const isUncertain = cell.verdict === 'uncertain';
            const isMismatch = cell.verdict === 'mismatch' || cell.verdict === 'blank';
            const displayChar = cell.predicted.trim() === '' ? '—' : cell.predicted;
            const pct = Math.round(cell.confidence * 100);

            const a11yParts = [
              `Ячейка ${cell.index + 1}: ${cell.predicted.trim() === '' ? 'пусто' : cell.predicted}`,
              isUncertain ? `сомнение ${pct}%` : null,
              isMismatch && cell.expected.trim() !== '' ? `отличается от ${cell.expected}` : null,
              cell.fixedByTeacher ? 'исправлено учителем' : null,
            ].filter(Boolean);

            return (
              <Pressable
                accessibilityLabel={a11yParts.join(', ')}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={`pred-${cell.index}`}
                onPress={() => onSelectCell?.(cell.index)}
                style={[
                  styles.cell,
                  styles.cellInteractive,
                  wrapCells && styles.cellWrapped,
                  isMismatch && styles.cellMismatch,
                  isUncertain && styles.cellUncertain,
                  cell.fixedByTeacher && !isMismatch && styles.cellFixedOk,
                  isSelected && (isUncertain ? styles.cellSelectedWarn : styles.cellSelected),
                ]}
              >
                <Text
                  style={[
                    styles.char,
                    isUncertain && styles.charUncertain,
                    cell.predicted.trim() === '' && styles.charBlank,
                  ]}
                >
                  {displayChar}
                </Text>
                {isUncertain ? (
                  <Text style={styles.confMicro}>{`${pct}%`}</Text>
                ) : cell.fixedByTeacher ? (
                  <Text style={styles.fixedMicro}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function ReviewCard({
  expected,
  recognized,
  onDecide,
  cells,
  selectedCellIndex,
  onSelectCell,
  onPickChar,
  onOpenFullAlphabet,
}: ReviewCardProps) {
  const translateX = useSharedValue(0);

  let basePan = Gesture.Pan();
  if ('activeOffsetX' in basePan && typeof basePan.activeOffsetX === 'function') {
    basePan = basePan.activeOffsetX([-18, 18]);
  }
  const pan = basePan
    .onUpdate((e) => {
      'worklet';
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      'worklet';
      const x = e.translationX;
      if (Math.abs(x) > 90) {
        const verdict = x > 0 ? 'accept' : 'reject';
        translateX.value = withSpring(x > 0 ? 420 : -420);
        runOnJS(onDecide)(verdict);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${translateX.value / 18}deg` },
    ],
  }));

  const acceptStampStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, translateX.value / 90),
  }));

  const rejectStampStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, -translateX.value / 90),
  }));

  const activeCell =
    cells && cells.length > 0
      ? (cells.find((c) => c.index === selectedCellIndex) ??
        cells.find((c) => c.verdict === 'uncertain') ??
        cells[0])
      : undefined;

  const topCandidates = activeCell?.top3 ?? [];
  const fallbackCandidates =
    topCandidates.length > 0
      ? topCandidates
      : activeCell && activeCell.expected.trim() !== ''
        ? [{ char: activeCell.expected, confidence: 1 }]
        : [];

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, cells && styles.cardCompact, cardAnimatedStyle]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.stamp, styles.stampReject, rejectStampStyle]}
          >
            <Text style={[styles.stampText, styles.stampTextReject]}>ОШИБКА</Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.stamp, styles.stampAccept, acceptStampStyle]}
          >
            <Text style={[styles.stampText, styles.stampTextAccept]}>ВЕРНО</Text>
          </Animated.View>
          <CharacterCells
            cells={cells}
            expected={expected}
            onSelectCell={onSelectCell}
            recognized={recognized}
            selectedCellIndex={activeCell?.index ?? selectedCellIndex}
          />
        </Animated.View>
      </GestureDetector>

      {activeCell && onPickChar ? (
        <View style={styles.top3Panel}>
          <View style={styles.top3Header}>
            <View
              style={[
                styles.spotDot,
                activeCell.verdict === 'uncertain' ? styles.spotDotWarn : styles.spotDotOk,
              ]}
            />
            <Text style={styles.top3Title}>
              {activeCell.verdict === 'uncertain'
                ? `Ячейка ${activeCell.index + 1} · Top-3 подсказки (1 тап)`
                : `Ячейка ${activeCell.index + 1} · Быстрая замена буквы`}
            </Text>
          </View>

          {fallbackCandidates.length > 0 ? (
            <View style={styles.top3Row}>
              {fallbackCandidates.map((cand, idx) => {
                const pct = Math.round(cand.confidence * 100);
                const isCurrent = activeCell.fixedByTeacher && activeCell.predicted === cand.char;
                const isPrimary = idx === 0;
                return (
                  <Pressable
                    accessibilityLabel={`Выбрать букву ${cand.char}, вероятность ${pct}%`}
                    accessibilityRole="button"
                    key={`${cand.char}-${idx}`}
                    onPress={() => onPickChar(activeCell.index, cand.char)}
                    style={({ pressed }) => [
                      styles.top3Chip,
                      isPrimary && styles.top3ChipPrimary,
                      isCurrent && styles.top3ChipSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.top3Char}>{cand.char}</Text>
                    <Text style={styles.top3Pct}>
                      {topCandidates.length > 0 ? `${pct}%` : 'эталон'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.secondaryRow}>
            <Pressable
              accessibilityLabel="Отметить ячейку пустой"
              accessibilityRole="button"
              onPress={() => onPickChar(activeCell.index, ' ')}
              style={({ pressed }) => [styles.secondaryChip, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryChipText}>Пусто</Text>
            </Pressable>
            {onOpenFullAlphabet ? (
              <Pressable
                accessibilityLabel="Открыть все 39 букв татарского алфавита"
                accessibilityRole="button"
                onPress={() => onOpenFullAlphabet(activeCell.index)}
                style={({ pressed }) => [
                  styles.secondaryChip,
                  styles.secondaryChipWide,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryChipText}>Другая буква (39)…</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <Text style={styles.caption}>Смахните вправо — верно, влево — ошибка</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    ...textStyles.caption,
    color: colors.textFaint,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sheet,
    justifyContent: 'center',
    minHeight: 240,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    position: 'relative',
  },
  cardCompact: {
    minHeight: 210,
    paddingVertical: spacing.lg,
  },
  cell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.divider,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'center',
    minWidth: 0,
  },
  cellFixedOk: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryDeep,
  },
  cellInteractive: {
    height: 50,
  },
  cellMismatch: {
    backgroundColor: withAlpha(colors.zoneBad, 0.18),
    borderColor: colors.zoneBad,
  },
  cellSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cellSelectedWarn: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  cellUncertain: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  cellWrapped: {
    flexBasis: 36,
    flexGrow: 0,
    minWidth: 36,
  },
  cells: {
    flexDirection: 'row',
    gap: spacing.xxs,
    justifyContent: 'space-between',
    width: '100%',
  },
  cellsWrap: {
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  char: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.titleSmall,
  },
  charBlank: {
    color: colors.textFaint,
    fontFamily: fontFamilies.medium,
  },
  charUncertain: {
    color: colors.warning,
  },
  comparison: {
    gap: spacing.sm,
  },
  confMicro: {
    color: colors.warning,
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
    lineHeight: 12,
  },
  fixedMicro: {
    color: colors.primary,
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    lineHeight: 12,
  },
  legendText: {
    color: colors.warning,
    fontFamily: fontFamilies.medium,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.84,
  },
  secondaryChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryChipText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.bodySmall,
  },
  secondaryChipWide: {
    flex: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  spotDot: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  spotDotOk: {
    backgroundColor: colors.primary,
  },
  spotDotWarn: {
    backgroundColor: colors.warning,
  },
  stamp: {
    borderRadius: radius.sm,
    borderWidth: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    position: 'absolute',
    top: spacing.md,
  },
  stampAccept: {
    borderColor: colors.primary,
    right: spacing.lg,
    transform: [{ rotate: '8deg' }],
  },
  stampReject: {
    borderColor: colors.error,
    left: spacing.lg,
    transform: [{ rotate: '-8deg' }],
  },
  stampText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.bodySmall,
  },
  stampTextAccept: {
    color: colors.primary,
  },
  stampTextReject: {
    color: colors.error,
  },
  top3Char: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.title,
    lineHeight: 26,
  },
  top3Chip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  top3ChipPrimary: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  top3ChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  top3Header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  top3Panel: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  top3Pct: {
    color: colors.textMuted,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.caption,
  },
  top3Row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  top3Title: {
    ...textStyles.caption,
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.semibold,
  },
  wordHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  wordLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.caption,
  },
  wordRow: {
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  wrapper: {
    gap: spacing.sm,
  },
});
