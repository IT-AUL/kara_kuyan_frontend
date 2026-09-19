import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  ProgressBar,
  Screen,
  ScreenHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { colors, spacing } from '@/design-system/tokens';

const steps = [
  'ArUco-маркеры найдены',
  'Лист выровнен к шаблону A4',
  'QR расшифрован',
  '8 ячеек обработаны локально',
] as const;

export function ProcessingScreen() {
  const router = useRouter();

  return (
    <Screen
      footer={
        <Button
          icon="arrowRight"
          onPress={() => router.push('/student-identified')}
          title="Продолжить"
        />
      }
    >
      <ScreenHeader
        eyebrow="Обработка"
        showBack
        subtitle="Проверяем разметку и ответы на устройстве."
        title="Лист обработан"
      />

      <Card style={styles.hero} tone="raised">
        <StatusPill label="100% локально" tone="success" />
        <Text selectable style={textStyles.display}>
          Результат готов
        </Text>
        <Text style={textStyles.bodySmall}>
          Изображение не сохраняется. Дальше используются только распознанные ответы и отметки
          качества.
        </Text>
        <ProgressBar percent={100} />
      </Card>

      <Card style={styles.stepsCard}>
        {steps.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepIndex}>
              <Text style={[textStyles.caption, styles.stepNumber]}>{index + 1}</Text>
            </View>
            <Text style={textStyles.body}>{step}</Text>
          </View>
        ))}
      </Card>

    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surfaceRaised,
    gap: spacing.md,
  },
  stepIndex: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepNumber: {
    color: colors.primary,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepsCard: {
    gap: spacing.sm,
  },
});
