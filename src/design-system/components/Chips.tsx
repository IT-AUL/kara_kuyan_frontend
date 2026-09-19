import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, fontFamilies, fontSizes, hairline, radius, spacing, touchTarget } from '../tokens';

type Chip = { key: string; label: string };

type ChipsProps = {
  items: readonly Chip[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  /** When set, a first chip with this label clears the selection. */
  allLabel?: string;
};

/** Single-choice filter chips in a horizontal row. */
export function Chips({ items, selected, onSelect, allLabel }: ChipsProps) {
  const all: readonly Chip[] = allLabel ? [{ key: '', label: allLabel }, ...items] : items;
  return (
    <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
      {all.map((chip) => {
        const active = chip.key === '' ? selected === null : selected === chip.key;
        return (
          <Pressable
            accessibilityLabel={chip.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            android_ripple={{ color: 'rgba(244, 248, 245, 0.12)' }}
            key={chip.key || 'all'}
            onPress={() => onSelect(chip.key === '' ? null : chip.key)}
            style={[styles.chip, active && styles.active]}
          >
            <Text numberOfLines={1} style={[styles.text, active && styles.activeText]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  activeText: { color: colors.background },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.pill,
    borderWidth: hairline,
    justifyContent: 'center',
    maxWidth: 240,
    minHeight: touchTarget - 8,
    paddingHorizontal: spacing.md,
  },
  row: { gap: spacing.xs, paddingRight: spacing.lg },
  text: { color: colors.text, fontFamily: fontFamilies.medium, fontSize: fontSizes.bodySmall },
});
