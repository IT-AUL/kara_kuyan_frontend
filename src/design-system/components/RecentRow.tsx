import { StyleSheet, Text, View } from 'react-native';

import type { ReactNode } from 'react';

import { textStyles } from '../theme';
import { colors, fontFamilies, hairline, radius, spacing } from '../tokens';

type RecentRowProps = {
  name: string;
  score: number;
  maxScore: number;
  grade: number;
  dateLabel: string;
  isLast: boolean;
  /** Extra status shown before the grade (e.g. «Ждёт отправки»); omit when nothing needs attention. */
  status?: ReactNode;
};

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function RecentRow({ name, score, maxScore, grade, dateLabel, isLast, status }: RecentRowProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${name}. Оценка ${grade}, ${score} из ${maxScore} баллов. ${dateLabel}`}
      style={[styles.row, !isLast && styles.divider]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(name)}</Text>
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={textStyles.body}>{name}</Text>
        <Text style={textStyles.caption}>{dateLabel}</Text>
      </View>
      {status}
      <Text style={styles.score}>{score}/{maxScore}</Text>
      <View style={styles.grade}>
        <Text style={styles.gradeText}>{grade}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  avatarText: { color: colors.successSoft, fontFamily: fontFamilies.semibold, fontSize: 14 },
  copy: { flex: 1, gap: 2 },
  divider: { borderBottomColor: colors.divider, borderBottomWidth: hairline },
  grade: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 32, justifyContent: 'center', width: 32 },
  gradeText: { color: colors.successSoft, fontFamily: fontFamilies.bold, fontSize: 16 },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 64 },
  score: { color: colors.textMuted, fontFamily: fontFamilies.semibold, fontSize: 14, fontVariant: ['tabular-nums'] },
});
