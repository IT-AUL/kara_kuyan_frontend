import { StyleSheet, Text, View } from 'react-native';

import { fontFamilies, fontSizes, radius } from '../tokens';

type SegmentItem = {
  value: number;
  color: string;
  label?: string;
};

type SegmentBarProps = {
  segments: SegmentItem[];
  height?: number;
  showCounts?: boolean;
};

export function SegmentBar({ segments, height = 36, showCounts = false }: SegmentBarProps) {
  const nonZero = segments.filter((segment) => segment.value > 0);
  const hasLabels = nonZero.some((segment) => Boolean(segment.label));

  return (
    <View>
      <View style={[styles.barRow, { height }]}>
        {nonZero.map((segment, index) => (
          <View
            key={`${segment.label ?? segment.color}-${index}`}
            style={[styles.block, { backgroundColor: segment.color, flex: segment.value }]}
          >
            {showCounts ? <Text style={styles.countText}>{segment.value}</Text> : null}
          </View>
        ))}
      </View>
      {hasLabels ? (
        <View style={styles.labelsRow}>
          {nonZero.map((segment, index) => (
            <View
              key={`label-${segment.label ?? segment.color}-${index}`}
              style={{ flex: segment.value }}
            >
              <Text style={[styles.labelText, { color: segment.color }]}>
                {segment.label ?? ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  barRow: {
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 3,
    overflow: 'hidden',
  },
  block: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#08100C',
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.bodySmall,
    fontVariant: ['tabular-nums'],
  },
  labelText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.caption,
    textAlign: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 6,
  },
});
