import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { demoAssessment, demoSheet } from '@/demo/demo-data';
import { Button, Card, Screen, ScreenHeader, StatusPill, textStyles } from '@/design-system';
import { spacing } from '@/design-system/tokens';
import { StudentIdentityCard } from './components/StudentIdentityCard';

export function StudentIdentifiedScreen() {
  const router = useRouter();

  return (
    <Screen
      footer={
        <Button
          icon="arrowRight"
          onPress={() => router.push('/assessment-result')}
          title="Показать результат"
        />
      }
    >
      <ScreenHeader
        eyebrow="Идентификация"
        showBack
        subtitle="Проверьте ученика до открытия результата."
        title="Лист распознан"
      />

      <StudentIdentityCard />

      <Card style={styles.meta}>
        <View style={styles.row}>
          <Text style={textStyles.bodySmall}>Работа</Text>
          <Text selectable style={textStyles.body}>
            {demoAssessment.title}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={textStyles.bodySmall}>Класс</Text>
          <Text style={textStyles.body}>{demoAssessment.className}</Text>
        </View>
        <View style={styles.row}>
          <Text style={textStyles.bodySmall}>Лист</Text>
          <Text style={textStyles.body}>{demoSheet.student.code} · 1 из 2</Text>
        </View>
      </Card>

      <Card style={styles.fallback} tone="soft">
        <StatusPill label="Если ученик не тот" tone="warning" />
        <Text style={textStyles.bodySmall}>
          Выбор ученика появится после подключения списка класса.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fallback: {
    gap: spacing.sm,
  },
  meta: {
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
