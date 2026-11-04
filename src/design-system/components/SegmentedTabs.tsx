import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies, radius } from '../tokens';

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
            accessibilityLabel={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            hitSlop={8}
            key={tab}
            onPress={() => handlePress(index)}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              numberOfLines={1}
              style={[styles.label, isActive && styles.labelActive]}
            >
              {tab}
            </Text>
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
    gap: 2,
    padding: 3,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  tab: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tabActive: {
    backgroundColor: colors.surfaceHigh,
  },
});
