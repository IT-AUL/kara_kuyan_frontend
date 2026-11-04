import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, hairline, radius, spacing } from '../tokens';

type HeroCardProps = {
  children: ReactNode;
  glow?: boolean;
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

export function HeroCard({ children, glow = true }: HeroCardProps) {
  return (
    <View style={styles.card}>
      {glow ? (
        <View
          pointerEvents="none"
          style={[styles.glow, { backgroundColor: withAlpha(colors.primary, 0.18) }]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.xxl,
    borderWidth: hairline,
    overflow: 'hidden',
    padding: spacing.lg,
    position: 'relative',
  },
  glow: {
    borderRadius: 100,
    height: 200,
    position: 'absolute',
    right: -70,
    top: -80,
    width: 200,
  },
});
