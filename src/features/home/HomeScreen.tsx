import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  demoAssessment,
  demoInsight,
  demoProgress,
  demoRecentSubmissions,
  demoTeacher,
} from '@/demo/demo-data';
import {
  AssessmentCard,
  Button,
  Card,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { colors, fontFamilies, spacing } from '@/design-system/tokens';

const statusTone = {
  correct: 'success',
  review: 'warning',
  pending: 'neutral',
} as const;

const statusLabel = {
  correct: 'Готово',
  review: 'На проверку',
  pending: 'Не отправлено',
} as const;

export function HomeScreen() {
  const router = useRouter();

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        eyebrow="Кара Куян"
        subtitle={demoTeacher.school}
        title="Гөлнара ханым"
      />

      <AssessmentCard
        assessment={demoAssessment}
        onContinue={() => router.push('/checking')}
        progress={demoProgress}
      />

      <Card style={styles.insightCard} tone="raised">
        <View style={styles.insightHeader}>
          <StatusPill icon="insight" label="Ключевой вывод" tone="info" />
          <Text style={textStyles.caption}>по 18 проверенным</Text>
        </View>
        <Text selectable style={textStyles.title}>
          {demoInsight.title}
        </Text>
        <Text style={textStyles.bodySmall}>{demoInsight.body}</Text>
        <Button
          icon="analytics"
          onPress={() => router.push('/analytics')}
          title="Открыть аналитику"
          variant="secondary"
        />
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Последние активности" />
        <Card style={styles.recentList}>
          {demoRecentSubmissions.map((sub, index) => (
            <ListRow
              icon="person"
              isLast={index === demoRecentSubmissions.length - 1}
              key={sub.student.id}
              right={
                <View style={styles.resultRight}>
                  <Text style={styles.resultText}>{sub.result}</Text>
                  <StatusPill
                    label={statusLabel[sub.status]}
                    tone={statusTone[sub.status]}
                  />
                </View>
              }
              subtitle={`${sub.student.code}`}
              title={sub.student.name}
              variant="plain"
            />
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  insightCard: {
    gap: spacing.md,
  },
  insightHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentList: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  resultRight: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  resultText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  section: {
    gap: spacing.sm,
  },
});
