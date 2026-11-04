import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

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

function CharacterCells({ expected, recognized }: { expected: string; recognized: string }) {
  const expectedChars = Array.from(expected);
  const recognizedChars = Array.from(recognized);

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

export function ReviewCard({ expected, recognized, onDecide }: ReviewCardProps) {
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
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

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
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
          <CharacterCells expected={expected} recognized={recognized} />
        </Animated.View>
      </GestureDetector>
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
    height: 300,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    position: 'relative',
  },
  cell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.divider,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    height: 38,
    justifyContent: 'center',
    minWidth: 0,
  },
  cellMismatch: {
    backgroundColor: withAlpha(colors.zoneBad, 0.18),
    borderColor: colors.zoneBad,
  },
  cells: {
    flexDirection: 'row',
    gap: spacing.xxs,
    justifyContent: 'space-between',
    width: '100%',
  },
  char: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.titleSmall,
  },
  comparison: {
    gap: spacing.sm,
  },
  stamp: {
    borderRadius: radius.sm,
    borderWidth: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    position: 'absolute',
    top: spacing.lg,
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
    gap: spacing.md,
  },
});
