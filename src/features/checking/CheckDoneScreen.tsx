import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useActiveContext } from '@/data/context';
import { useTestOverview } from '@/data/testOverview';
import { AppIcon, Button, Card, GlowLayer, Screen, textStyles } from '@/design-system';
import { withAlpha } from '@/design-system/color';
import { useMotion } from '@/design-system/motion';
import { colors, fontFamilies, hairline, radius, spacing } from '@/design-system/tokens';

export function CheckDoneScreen() {
  const router = useRouter();
  const ctx = useActiveContext();
  const o = useTestOverview(ctx.assignmentId);
  const { reduced } = useMotion();

  const checked = o.progress.checked;
  const total = o.progress.total;
  const average = o.average;
  const grades = o.grades;
  const quality =
    total > 0 && checked > 0 ? Math.round(((grades['5'] + grades['4']) / checked) * 100) : null;

  return (
    <Screen
      contentStyle={styles.content}
      footer={
        <>
          <Button
            onPress={() => router.push({ pathname: '/test-detail', params: { id: ctx.assignmentId ?? '' } })}
            title="Посмотреть итоги"
            variant="primary"
          />
          <Button onPress={() => router.back()} title="К очереди" variant="ghost" />
        </>
      }
    >
      <View style={styles.heroWrap}>
        <GlowLayer color={colors.primary} size={220} />
        <Animated.View
          entering={reduced ? undefined : ZoomIn.springify()}
          style={styles.circle}
        >
          <AppIcon color={colors.background} name="check" size={54} />
        </Animated.View>
      </View>

      <View style={styles.headingGroup}>
        <Text accessibilityRole="header" style={styles.title}>
          Класс проверен
        </Text>
        <Text style={styles.subtitle}>
          {checked} из {total}
        </Text>
      </View>

      <View style={styles.tiles}>
        <Card
          accessibilityLabel={`Средний результат: ${average !== null ? `${average}%` : 'нет данных'}`}
          style={styles.tileAverage}
        >
          <Text style={[styles.tileValue, styles.averageColor]}>
            {average !== null ? `${average}%` : '—'}
          </Text>
          <Text style={styles.tileLabel}>Средний результат</Text>
        </Card>
        <Card
          accessibilityLabel={`Качество знаний: ${quality !== null ? `${quality}%` : 'нет данных'}`}
          style={styles.tileQuality}
        >
          <Text style={[styles.tileValue, styles.qualityColor]}>
            {quality !== null ? `${quality}%` : '—'}
          </Text>
          <Text style={styles.tileLabel}>Качество знаний</Text>
        </Card>
      </View>
    </Screen>
  );
}

const tileBase = {
  alignItems: 'center',
  borderRadius: radius.xxl,
  borderWidth: hairline,
  flex: 1,
  gap: spacing.xxs,
  justifyContent: 'center',
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.md,
} as const;

const styles = StyleSheet.create({
  averageColor: {
    color: colors.grade4,
  },
  circle: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  headingGroup: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  qualityColor: {
    color: colors.primary,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  tileAverage: {
    ...tileBase,
    borderColor: withAlpha(colors.grade4, 0.25),
  },
  tileLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  tileQuality: {
    ...tileBase,
    borderColor: withAlpha(colors.primary, 0.25),
  },
  tileValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    lineHeight: 32,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
});
