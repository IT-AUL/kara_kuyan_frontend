import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies, fontSizes, radius, spacing, touchTarget } from '../tokens';

type SegmentedTabsProps = {
  tabs: readonly string[];
  activeIndex?: number;
  onTabChange?: (index: number) => void;
};

export function SegmentedTabs({ tabs, activeIndex: controlledIndex, onTabChange }: SegmentedTabsProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex ?? internalIndex;

  const handlePress = (index: number) => {
    setInternalIndex(index);
    onTabChange?.(index);
  };

  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab}
            onPress={() => handlePress(index)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: spacing.xxs,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.bodySmall,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
  },
  tab: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: touchTarget - spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
  },
});
