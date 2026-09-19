import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useMotion } from '../motion';
import { colors } from '../tokens';

type StudentDotsProps = {
  total: number;
  checked: number;
  /** Dot per student: filled = checked. Carries an accessibility summary; the numbers next to it carry the meaning. */
  size?: 'md' | 'sm';
};

const MAX_ANIMATED = 60;

export function StudentDots({ total, checked, size = 'md' }: StudentDotsProps) {
  const { reduced } = useMotion();
  const dot = total > 40 || size === 'sm' ? 6 : 10;
  const animate = !reduced && total <= MAX_ANIMATED;

  return (
    <View
      accessibilityLabel={`Проверено ${checked} из ${total}`}
      accessible
      style={[styles.row, { gap: dot * 0.6 }]}
    >
      {Array.from({ length: total }, (_, i) => {
        const done = i < checked;
        return (
          <Animated.View
            entering={animate ? ZoomIn.delay(Math.min(i * 14, 500)).duration(260) : undefined}
            key={i}
            style={{ backgroundColor: done ? colors.primary : colors.divider, borderRadius: dot / 2, height: dot, width: dot }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap' } });
