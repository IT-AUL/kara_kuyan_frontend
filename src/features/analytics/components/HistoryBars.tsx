import { StyleSheet, Text, View } from 'react-native';

import {
  fontFamilies,
  fontSizes,
  radius,
  spacing,
  textStyles,
  zoneColor,
} from '@/design-system';

export type HistoryBarItem = {
  label: string;
  pct: number;
};

export type HistoryBarsProps = {
  items: HistoryBarItem[];
  height?: number;
};

const TOP_LABEL_SPACE = 20;

export function HistoryBars({ items, height = 112 }: HistoryBarsProps) {
  if (items.length === 0) {
    return null;
  }

  const line50Bottom = Math.round(height * 0.5);
  const line80Bottom = Math.round(height * 0.8);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.plotArea,
          { height: height + TOP_LABEL_SPACE, paddingTop: TOP_LABEL_SPACE },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.dashedLine, { bottom: line50Bottom }]}
        />
        <View
          pointerEvents="none"
          style={[styles.dashedLine, { bottom: line80Bottom }]}
        />
        <View style={styles.barsRow}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const roundedPct = Math.round(item.pct);
            const clampedPct = Math.max(0, Math.min(100, item.pct));
            const barHeight = Math.max(
              4,
              Math.round((clampedPct / 100) * height),
            );
            const barColor = zoneColor(item.pct);

            return (
              <View key={`${item.label}-${index}`} style={styles.barColumn}>
                {isLast ? (
                  <Text style={[styles.lastPct, { color: barColor }]}>
                    {roundedPct}%
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: barColor,
                      height: barHeight,
                      opacity: isLast ? 1 : 0.6,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.labelsRow}>
        {items.map((item, index) => (
          <View key={`lbl-${item.label}-${index}`} style={styles.labelCell}>
            <Text
              numberOfLines={1}
              style={[textStyles.caption, styles.labelText]}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: radius.sm,
    width: '100%',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  barsRow: {
    alignItems: 'flex-end',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  container: {
    gap: spacing.xxs,
  },
  dashedLine: {
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    borderTopWidth: 1,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  labelCell: {
    alignItems: 'center',
    flex: 1,
  },
  labelText: {
    textAlign: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  lastPct: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.caption,
    fontVariant: ['tabular-nums'],
    lineHeight: 16,
    marginBottom: 2,
  },
  plotArea: {
    position: 'relative',
  },
});
