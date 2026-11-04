import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies, fontSizes, spacing, touchTarget } from '../tokens';
import { initials } from '../zones';

type AvatarRing = 'done' | 'review' | 'none';

type AvatarProps = {
  name: string;
  size?: number;
  ring?: AvatarRing;
  onPress?: () => void;
};

type AvatarStackProps = {
  names: string[];
  max?: number;
  size?: number;
};

export function Avatar({ name, size = 36, ring = 'none', onPress }: AvatarProps) {
  const borderColor =
    ring === 'done' ? colors.primary : ring === 'review' ? colors.warning : undefined;
  const circle = (
    <View
      style={[
        styles.circle,
        {
          borderRadius: size / 2,
          height: size,
          width: size,
        },
        borderColor ? { borderColor, borderWidth: 2 } : null,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );

  if (!onPress) {
    return circle;
  }

  const hitSlop = Math.max(0, Math.ceil((touchTarget - size) / 2));

  return (
    <Pressable
      accessibilityLabel={name}
      accessibilityRole="button"
      hitSlop={hitSlop}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {circle}
    </Pressable>
  );
}

export function AvatarStack({ names, max = 6, size = 36 }: AvatarStackProps) {
  const visible = names.slice(0, max);
  const overflowCount = names.length - visible.length;

  return (
    <View style={styles.stackRow}>
      {visible.map((name, index) => (
        <View
          key={`${name}-${index}`}
          style={[
            styles.stackItem,
            {
              borderRadius: size / 2,
              height: size,
              marginLeft: index === 0 ? 0 : -5,
              width: size,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
        </View>
      ))}
      {overflowCount > 0 ? <Text style={styles.overflowText}>+{overflowCount}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
  },
  initials: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
  },
  overflowText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.caption,
    marginLeft: spacing.xs,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  stackItem: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.surface,
    borderWidth: 2,
    justifyContent: 'center',
  },
  stackRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
