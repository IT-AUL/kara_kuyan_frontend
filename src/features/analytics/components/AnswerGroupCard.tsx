import { StyleSheet, Text, View } from 'react-native';

import {
  AvatarStack,
  Card,
  colors,
  fontFamilies,
  fontSizes,
  radius,
  spacing,
  textStyles,
} from '@/design-system';
import { diffMask } from '@/domain/analytics/stats';

export type AnswerGroupCardProps = {
  answer: string;
  expected: string;
  count: number;
  total: number;
  names: string[];
};

export function AnswerGroupCard({
  answer,
  expected,
  count,
  total,
  names,
}: AnswerGroupCardProps) {
  const trimmed = answer.trim();
  const isEmpty = trimmed.length === 0;
  const chars = Array.from(trimmed);
  const mask = isEmpty ? [] : diffMask(trimmed, expected);
  const ratioPct = total > 0 ? Math.max(0, Math.min(100, (count / total) * 100)) : 0;

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.answerWrap}>
          {isEmpty ? (
            <Text style={[styles.answerText, styles.emptyAnswer]}>пусто</Text>
          ) : (
            <Text style={styles.answerText}>
              {chars.map((char, index) =>
                mask[index] ? (
                  <Text key={index} style={styles.diffChar}>
                    {char}
                  </Text>
                ) : (
                  char
                ),
              )}
            </Text>
          )}
        </View>

        <View style={styles.countCol}>
          <Text style={styles.countNumber}>{count}</Text>
          <Text style={textStyles.caption}>учен.</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${ratioPct}%` }]} />
      </View>

      <AvatarStack max={6} names={names} size={28} />
    </Card>
  );
}

const styles = StyleSheet.create({
  answerText: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.title,
    letterSpacing: 1,
    lineHeight: 28,
  },
  answerWrap: {
    flex: 1,
  },
  barFill: {
    backgroundColor: colors.zoneBad,
    borderRadius: radius.pill,
    height: '100%',
  },
  barTrack: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  card: {
    gap: spacing.sm,
  },
  countCol: {
    alignItems: 'flex-end',
  },
  countNumber: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    lineHeight: 30,
  },
  diffChar: {
    color: colors.zoneBad,
    textDecorationLine: 'underline',
  },
  emptyAnswer: {
    color: colors.textFaint,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
});
