import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  fontFamilies,
  fontSizes,
  radius,
  touchTarget,
} from '@/design-system';
import { withAlpha } from '@/design-system/color';

export type LetterKeyProps = {
  letter: string;
  errorPct: number | null;
  big?: boolean;
  selected?: boolean;
  onPress: () => void;
};

function resolveLetterColors(errorPct: number | null): {
  bg: string;
  fg: string;
} {
  if (errorPct === null) {
    return {
      bg: colors.surfaceRaised,
      fg: colors.textFaint,
    };
  }
  if (errorPct >= 30) {
    return {
      bg: withAlpha(colors.zoneBad, 0.2),
      fg: colors.zoneBad,
    };
  }
  if (errorPct >= 15) {
    return {
      bg: withAlpha(colors.zoneMid, 0.2),
      fg: colors.zoneMid,
    };
  }
  if (errorPct >= 8) {
    return {
      bg: withAlpha(colors.zoneMid, 0.14),
      fg: withAlpha(colors.zoneMid, 0.7),
    };
  }
  return {
    bg: withAlpha(colors.textMuted, 0.2),
    fg: colors.textMuted,
  };
}

export function LetterKey({
  letter,
  errorPct,
  big = false,
  selected = false,
  onPress,
}: LetterKeyProps) {
  const { bg, fg } = resolveLetterColors(errorPct);
  const roundedPct = errorPct !== null ? Math.round(errorPct) : null;
  const height = big ? 78 : 44;
  const hitSlop = Math.max(0, Math.ceil((touchTarget - height) / 2));
  const label =
    roundedPct !== null
      ? `Буква ${letter}, ошибка ${roundedPct}%`
      : `Буква ${letter}, нет данных`;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={hitSlop}
      onPress={onPress}
      style={({ pressed }) => [
        styles.surfaceBase,
        { height },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.keyOverlay,
          { backgroundColor: bg },
          selected && styles.selected,
        ]}
      >
        <Text
          style={[
            styles.letter,
            big ? styles.letterBig : styles.letterSmall,
            { color: fg },
          ]}
        >
          {letter}
        </Text>
        {big && roundedPct !== null ? (
          <Text style={[styles.pct, { color: fg }]}>{roundedPct}%</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  keyOverlay: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  letter: {
    fontFamily: fontFamilies.semibold,
  },
  letterBig: {
    fontSize: 30,
    lineHeight: 34,
  },
  letterSmall: {
    fontSize: 17,
    lineHeight: 22,
  },
  pct: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.caption,
    fontVariant: ['tabular-nums'],
    lineHeight: 16,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  selected: {
    borderColor: colors.text,
    borderWidth: 2,
  },
  surfaceBase: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flex: 1,
    overflow: 'hidden',
  },
});
