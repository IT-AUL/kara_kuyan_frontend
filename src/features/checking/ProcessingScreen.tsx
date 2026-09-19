import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, ScreenHeader, StatusPill, textStyles } from '@/design-system';
import { colors, spacing } from '@/design-system/tokens';
import { scanSession, useScanSession } from './scanSession';

export function ProcessingScreen() {
  const router = useRouter();
  const { phase, error, rejection } = useScanSession();

  useEffect(() => {
    if (phase === 'ready') router.replace('/student-identified');
  }, [phase, router]);

  const retry = () => {
    scanSession.reset();
    router.back();
  };

  return (
    <Screen
      footer={
        phase === 'error' ? (
          <View style={styles.footer}>
            <Button icon="scan" onPress={retry} title="Сканировать заново" />
            {rejection ? <Button icon="check" onPress={() => scanSession.forceCheck()} title="Всё равно проверить" variant="secondary" /> : null}
          </View>
        ) : undefined
      }
    >
      <ScreenHeader
        eyebrow="Обработка"
        subtitle="Выравниваем лист и читаем ответы на устройстве."
        title={phase === 'error' ? 'Не получилось' : 'Читаем лист'}
      />

      <Card style={styles.hero} tone="raised">
        <StatusPill label="100% локально" tone="success" />
        {phase === 'error' ? (
          <>
            <Text selectable style={textStyles.title}>
              {error}
            </Text>
            {rejection ? <Text style={textStyles.bodySmall}>«Всё равно проверить» оценит лист по тесту из QR или по выбранному тесту, с предупреждением. Результат может быть неверным.</Text> : null}
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={textStyles.bodySmall}>
              Изображение не сохраняется. Дальше используются только распознанные ответы.
            </Text>
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.xs },
  hero: { backgroundColor: colors.surfaceRaised, gap: spacing.md },
});
