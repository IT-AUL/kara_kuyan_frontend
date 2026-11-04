import { StyleSheet, Text, View } from 'react-native';

import { fontFamilies, radius } from '../tokens';
import { gradeColor } from '../zones';

type GradePillProps = {
  grade: 2 | 3 | 4 | 5;
  size?: number;
};

function withAlpha(hex: string, a: number): string {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return hex;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function GradePill({ grade, size = 34 }: GradePillProps) {
  const fg = gradeColor(grade);
  const bg = withAlpha(fg, 0.16);

  return (
    <View
      accessibilityLabel={`Оценка ${grade}`}
      style={[
        styles.container,
        {
          backgroundColor: bg,
          height: size,
          width: size,
        },
      ]}
    >
      <Text style={[styles.text, { color: fg, fontSize: size * 0.48 }]}>{grade}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  text: {
    fontFamily: fontFamilies.bold,
    fontVariant: ['tabular-nums'],
  },
});
