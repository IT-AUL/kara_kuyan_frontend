import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BottomSheet,
  colors,
  fontFamilies,
  fontSizes,
  radius,
  spacing,
  textStyles,
} from '@/design-system';

/** The 6 special Tatar Cyrillic uppercase letters highlighted first for 1-tap access. */
export const TATAR_SPECIAL_LETTERS = ['Ә', 'Ө', 'Ү', 'Җ', 'Ң', 'Һ'] as const;

/** Remaining 33 Cyrillic uppercase letters of the 39-class Tatar v4 alphabet. */
export const CYRILLIC_BASE_LETTERS = [
  'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й',
  'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф',
  'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я',
] as const;

export type TatarLetterPickerSheetProps = {
  visible: boolean;
  cellNumber?: number;
  expectedChar?: string;
  currentChar?: string;
  onSelect: (char: string) => void;
  onClose: () => void;
};

export function TatarLetterPickerSheet({
  visible,
  cellNumber,
  expectedChar,
  currentChar,
  onSelect,
  onClose,
}: TatarLetterPickerSheetProps) {
  const title = cellNumber ? `Ячейка ${cellNumber} · Выберите букву` : 'Выберите букву (39 букв)';

  const pick = (char: string) => {
    onSelect(char);
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title={title} visible={visible}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {expectedChar && expectedChar.trim() !== '' ? (
          <Text style={styles.hint}>
            {`По эталону ожидается «${expectedChar}»`}
          </Text>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Татарские буквы</Text>
            <Pressable
              accessibilityLabel="Пустая клетка"
              accessibilityRole="button"
              onPress={() => pick(' ')}
              style={({ pressed }) => [
                styles.blankChip,
                currentChar?.trim() === '' && styles.keySelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.blankChipText}>Пустая клетка</Text>
            </Pressable>
          </View>
          <View style={styles.specialRow}>
            {TATAR_SPECIAL_LETTERS.map((letter) => {
              const selected = currentChar === letter;
              return (
                <Pressable
                  accessibilityLabel={`Буква ${letter}`}
                  accessibilityRole="button"
                  key={letter}
                  onPress={() => pick(letter)}
                  style={({ pressed }) => [
                    styles.specialKey,
                    selected && styles.keySelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.keyText, selected && styles.keyTextSelected]}>{letter}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Весь алфавит</Text>
          <View style={styles.grid}>
            {CYRILLIC_BASE_LETTERS.map((letter) => {
              const selected = currentChar === letter;
              return (
                <Pressable
                  accessibilityLabel={`Буква ${letter}`}
                  accessibilityRole="button"
                  key={letter}
                  onPress={() => pick(letter)}
                  style={({ pressed }) => [
                    styles.gridKey,
                    selected && styles.keySelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.keyText, selected && styles.keyTextSelected]}>{letter}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  blankChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.divider,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  blankChipText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.caption,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  gridKey: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    minWidth: 42,
    paddingHorizontal: spacing.xs,
  },
  hint: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  keySelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  keyText: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.titleSmall,
  },
  keyTextSelected: {
    color: colors.primary,
  },
  pressed: {
    opacity: 0.82,
  },
  scroll: {
    maxHeight: 420,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specialKey: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    minWidth: 42,
  },
  specialRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
