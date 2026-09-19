import { StyleSheet, View, type ViewStyle } from 'react-native';

import { withAlpha } from '../color';

type GlowLayerProps = { color: string; size: number; style?: ViewStyle };

/** Soft light made of concentric translucent discs (no shadows/elevation: they clip and grey out on Android). */
export function GlowLayer({ color, size, style }: GlowLayerProps) {
  // many faint discs read as a smooth radial falloff instead of hard rings
  const discs = Array.from({ length: 8 }, (_, i) => ({ d: size * (1 - i * 0.11), a: 0.028 }));
  return (
    <View pointerEvents="none" style={[{ height: size, width: size }, styles.center, style]}>
      {discs.map(({ d, a }) => (
        <View key={d} style={[styles.disc, { backgroundColor: withAlpha(color, a), borderRadius: d / 2, height: d, width: d }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', position: 'absolute' },
  disc: { position: 'absolute' },
});
