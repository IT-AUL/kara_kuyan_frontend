import { StyleSheet, Text, View } from 'react-native';

import { textStyles } from '../theme';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../tokens';

type BarItem = {
  label: string;
  value: number;
  maxValue?: number;
};

type BarChartProps = {
  bars: readonly BarItem[];
  title?: string;
};

export function BarChart({ bars, title }: BarChartProps) {
  const maxValue = Math.max(...bars.map((b) => b.maxValue ?? b.value), 1);

  return (
    <View accessibilityLabel={title ?? 'Диаграмма'} style={styles.container}>
      {title ? <Text style={textStyles.body}>{title}</Text> : null}
      <View style={styles.chart}>
        {bars.map((bar, index) => {
          const heightPercent = (bar.value / maxValue) * 100;
          const isLast = index === bars.length - 1;
          return (
            <View key={bar.label} style={styles.barGroup}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor: isLast ? colors.primary : colors.surfaceRaised,
                    },
                  ]}
                />
              </View>
              <Text style={styles.label}>{bar.label}</Text>
              <Text style={[styles.valueLabel, isLast && styles.valueLabelActive]}>
                {bar.value}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const BAR_HEIGHT = 120;

const styles = StyleSheet.create({
  barFill: {
    borderRadius: radius.sm,
    minHeight: 8,
    width: '100%',
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xxs,
  },
  barTrack: {
    height: BAR_HEIGHT,
    justifyContent: 'flex-end',
    width: 40,
  },
  chart: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textFaint,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.caption,
  },
  valueLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.caption,
  },
  valueLabelActive: {
    color: colors.primary,
  },
});
