import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../tokens';

type ProgressBarProps = {
  percent: number;
  color?: string;
};

export function ProgressBar({ percent, color = colors.primary }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(percent, 100));

  return (
    <View accessibilityLabel={`Прогресс ${clamped}%`} style={styles.track}>
      <View style={[styles.fill, { backgroundColor: color, width: `${clamped}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  track: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
});
