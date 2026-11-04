import { StyleSheet, View } from 'react-native';

import { colors } from '../tokens';

type MiniBarsProps = {
  values: number[];
  height?: number;
  color?: string;
  highlightLast?: boolean;
};

export function MiniBars({
  values,
  height = 32,
  color = colors.primary,
  highlightLast = true,
}: MiniBarsProps) {
  if (values.length === 0) {
    return null;
  }

  const maxValue = Math.max(...values, 1);

  return (
    <View style={[styles.container, { height }]}>
      {values.map((val, index) => {
        const isLast = index === values.length - 1;
        const barHeight = Math.max(3, (Math.max(0, val) / maxValue) * height);
        const dim = highlightLast && !isLast;

        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                backgroundColor: color,
                height: barHeight,
                opacity: dim ? 0.45 : 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 3,
    width: 6,
  },
  container: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
  },
});
