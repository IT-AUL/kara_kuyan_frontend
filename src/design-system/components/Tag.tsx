import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies, fontSizes, radius } from '../tokens';
import { AppIcon, type AppIconName } from './AppIcon';

type TagTone = 'ok' | 'mid' | 'bad' | 'info' | 'neutral' | 'rule';

type TagProps = {
  label: string;
  tone: TagTone;
  color?: string;
  icon?: AppIconName;
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

const toneColorMap: Record<Exclude<TagTone, 'rule'>, string> = {
  ok: colors.zoneOk,
  mid: colors.zoneMid,
  bad: colors.zoneBad,
  info: colors.grade4,
  neutral: colors.textMuted,
};

export function Tag({ label, tone, color, icon }: TagProps) {
  const fgColor = tone === 'rule' ? (color ?? colors.ruleSin) : toneColorMap[tone];
  const bgColor = withAlpha(fgColor, 0.14);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {icon ? <AppIcon color={fgColor} name={icon} size={14} /> : null}
      <Text style={[styles.label, { color: fgColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    height: 24,
    paddingHorizontal: 9,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.caption,
  },
});
