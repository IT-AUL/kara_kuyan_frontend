import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { demoRecentSubmissions } from '@/demo/demo-data';
import {
  Button,
  Card,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { spacing } from '@/design-system/tokens';

const submissionTone = {
  correct: 'success',
  pending: 'neutral',
  review: 'warning',
} as const;

const submissionLabel = {
  correct: 'Готово',
  pending: 'Не отправлено',
  review: 'На проверку',
} as const;

export function CheckScreen() {
  const router = useRouter();

  return (
    <Screen edges={['top']}>
      <ScreenHeader subtitle="7-А · Татар теле" title="Проверка работ" />

      <Card style={styles.hero} tone="raised">
        <Text selectable style={textStyles.title}>
          Контрольная работа №3
        </Text>
        <Text style={textStyles.bodySmall}>18 из 25 проверено · следующий: Галиев Амир Р.</Text>
        <Button
          icon="scan"
          onPress={() => router.push('/scan')}
          title="Сканировать следующий лист"
        />
      </Card>

      <View style={styles.section}>
        <SectionHeader
          action={<StatusPill label="Ожидают отправки: 3" tone="neutral" />}
          title="Последние работы"
        />
        <Card style={styles.list}>
          {demoRecentSubmissions.map(({ result, status, student }, index) => (
            <ListRow
              icon="person"
              isLast={index === demoRecentSubmissions.length - 1}
              key={student.id}
              right={<StatusPill label={submissionLabel[status]} tone={submissionTone[status]} />}
              subtitle={`${student.code} · ${result}`}
              title={student.name}
              variant="plain"
            />
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md,
  },
  list: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
});
