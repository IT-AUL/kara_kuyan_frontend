import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies } from '@/design-system/tokens';

type CellBoxesProps = { answer?: string; cellCount: number; size?: number };

/** The answer row as it is printed on the sheet: one box per cell, the answer letter inside. */
export function CellBoxes({ answer = '', cellCount, size }: CellBoxesProps) {
  const letters = size !== undefined ? [...answer.toUpperCase()] : [];
  const boxDimensions = size !== undefined ? { height: size, width: size } : styles.emptyBox;
  return (
    <View
      accessible
      accessibilityLabel={answer ? `Ответ ${answer}, клеток: ${cellCount}` : `Клеток: ${cellCount}`}
      style={styles.row}
    >
      {Array.from({ length: cellCount }, (_, i) => (
        <View key={i} style={[styles.box, boxDimensions]}>
          {size !== undefined && letters[i] ? (
            <Text maxFontSizeMultiplier={1} style={[styles.letter, { fontSize: size * 0.58 }]}>
              {letters[i]}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    borderColor: colors.divider,
    borderRadius: 2,
    borderWidth: 1.2,
    justifyContent: 'center',
  },
  emptyBox: {
    height: 13,
    width: 11,
  },
  letter: { color: colors.successSoft, fontFamily: fontFamilies.semibold },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
});
