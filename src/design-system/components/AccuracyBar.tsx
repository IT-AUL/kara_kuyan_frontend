import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies, fontSizes, radius, spacing, touchTarget } from '../tokens';
import { zoneColor } from '../zones';

type AccuracyBarProps = {
  label: string;
  value: number;
  caption?: string;
  onPress?: () => void;
};

export function AccuracyBar({ label, value, caption, onPress }: AccuracyBarProps) {
  const rounded = Math.round(value);
  const clamped = Math.max(0, Math.min(100, value));
  const barColor = zoneColor(value);

  const content = (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.labelColumn}>
          <Text style={styles.label}>{label}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
        <Text style={[styles.value, { color: barColor }]}>{rounded}%</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              width: `${clamped}%`,
            },
          ]}
        />
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityLabel={`${label}, ${rounded}%`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: colors.textFaint,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.caption,
    lineHeight: 16,
    marginTop: 2,
  },
  container: {
    gap: spacing.xs,
  },
  fill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  label: {
    color: colors.text,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.bodySmall,
    lineHeight: 20,
  },
  labelColumn: {
    flex: 1,
  },
  pressable: {
    justifyContent: 'center',
    minHeight: touchTarget,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  track: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  value: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.bodySmall,
    fontVariant: ['tabular-nums'],
  },
});
