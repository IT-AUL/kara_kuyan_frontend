import type { TextStyle } from 'react-native';

import { colors, fontFamilies, fontSizes, hairline, radius, spacing, touchTarget } from './tokens';

export const theme = {
  colors,
  fontFamilies,
  fontSizes,
  hairline,
  radius,
  spacing,
  touchTarget,
} as const;

export const textStyles = {
  eyebrow: {
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  display: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.display,
    lineHeight: 36,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.title,
    lineHeight: 28,
  },
  titleSmall: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.titleSmall,
    lineHeight: 24,
  },
  body: {
    color: colors.text,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    lineHeight: 22,
  },
  bodySmall: {
    color: colors.textMuted,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.bodySmall,
    lineHeight: 20,
  },
  caption: {
    color: colors.textFaint,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.caption,
    lineHeight: 16,
  },
  numeric: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.title,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;
