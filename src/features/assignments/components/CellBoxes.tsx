import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies, radius } from '@/design-system/tokens';

type CellBoxesProps = { answer: string; cellCount: number; size?: number };

/** The answer row as it is printed on the sheet: one box per cell, the answer letter inside. */
export function CellBoxes({ answer, cellCount, size = 22 }: CellBoxesProps) {
  const letters = [...answer.toUpperCase()];
  return (
    <View accessible accessibilityLabel={`Ответ ${answer}, клеток: ${cellCount}`} style={styles.row}>
      {Array.from({ length: cellCount }, (_, i) => (
        <View key={i} style={[styles.box, { height: size, width: size }]}>
          <Text maxFontSizeMultiplier={1} style={[styles.letter, { fontSize: size * 0.58 }]}>{letters[i] ?? ''}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', backgroundColor: colors.surfaceSoft, borderColor: colors.divider, borderRadius: radius.sm / 2, borderWidth: 1, justifyContent: 'center' },
  letter: { color: colors.successSoft, fontFamily: fontFamilies.semibold },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
});
