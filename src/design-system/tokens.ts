export const colors = {
  background: '#0B0F0D',
  surface: '#141A17',
  surfaceRaised: '#1B241F',
  surfaceSoft: '#101512',
  primary: '#25E38A',
  primaryDeep: '#0D8F54',
  primarySoft: '#173B2C',
  successSoft: '#A7F3C8',
  text: '#F4F8F5',
  textMuted: '#99AAA1',
  textFaint: '#82948A',
  divider: '#2A352E',
  warning: '#F5B942',
  warningSoft: '#3A2D13',
  error: '#FF6868',
  errorSoft: '#3B1D1D',
  overlay: 'rgba(4, 8, 6, 0.72)',
  paper: '#DCE5DF',
  paperMuted: '#4B5B52',
  scanBackdrop: '#030604',
  transparent: 'transparent',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const hairline = 1;

export const fontFamilies = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  fallbackRegular: 'NotoSans_400Regular',
  fallbackMedium: 'NotoSans_500Medium',
  fallbackSemibold: 'NotoSans_600SemiBold',
  fallbackBold: 'NotoSans_700Bold',
} as const;

export const fontSizes = {
  caption: 12,
  bodySmall: 14,
  body: 16,
  titleSmall: 18,
  title: 22,
  display: 30,
  hero: 40,
} as const;

export const touchTarget = 48;
