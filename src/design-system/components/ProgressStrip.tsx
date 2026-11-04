import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../tokens';

type ProgressStripProps = {
  total: number;
  done: number;
  review?: number;
  height?: number;
};

export function ProgressStrip({ total, done, review = 0, height = 8 }: ProgressStripProps) {
  if (total <= 0) {
    return (
      <View
        accessibilityLabel={`${done} из ${total}`}
        style={[styles.track, { height }]}
      />
    );
  }

  const safeDone = Math.max(0, Math.min(done, total));
  const safeReview = Math.max(0, Math.min(review, safeDone));
  const greenRatio = Math.max(0, (safeDone - safeReview) / total);
  const amberRatio = Math.max(0, safeReview / total);

  return (
    <View
      accessibilityLabel={`${done} из ${total}`}
      style={[styles.track, { height }]}
    >
      {greenRatio > 0 ? (
        <View style={[styles.segment, styles.green, { width: `${greenRatio * 100}%` }]} />
      ) : null}
      {amberRatio > 0 ? (
        <View style={[styles.segment, styles.amber, { width: `${amberRatio * 100}%` }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  amber: {
    backgroundColor: colors.warning,
  },
  green: {
    backgroundColor: colors.primary,
  },
  segment: {
    height: '100%',
  },
  track: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 2,
    overflow: 'hidden',
    width: '100%',
  },
});
