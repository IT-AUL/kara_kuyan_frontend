import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, Button, Card, Screen, ScreenHeader, Tag, textStyles } from '@/design-system';
import { colors, radius, spacing } from '@/design-system/tokens';
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

  if (phase === 'error') {
    return (
      <Screen
        footer={
          <View style={styles.footer}>
            <Button icon="scan" onPress={retry} title="Сканировать заново" />
            {rejection ? (
              <Button
                icon="check"
                onPress={() => scanSession.forceCheck()}
                title="Всё равно проверить"
                variant="secondary"
              />
            ) : null}
          </View>
        }
      >
        <ScreenHeader
          eyebrow="Обработка"
          subtitle="Выравниваем лист и читаем ответы на устройстве."
          title="Не получилось"
        />

        <Card style={styles.errorCard} tone="raised">
          <Tag icon="warning" label="Ошибка чтения" tone="bad" />
          <Text selectable style={textStyles.titleSmall}>
            {error}
          </Text>
          {rejection ? (
            <Text style={textStyles.bodySmall}>
              «Всё равно проверить» оценит лист по тесту из QR или по выбранному тесту, с предупреждением. Результат может быть неверным.
            </Text>
          ) : null}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <AppIcon color={colors.primary} name="scan" size={44} />
        </View>
        <Text style={[textStyles.titleSmall, styles.title]}>Проверяю лист…</Text>
        <Text style={[textStyles.caption, styles.caption]}>Обычно это секунда</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  caption: {
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  errorCard: {
    gap: spacing.md,
  },
  footer: {
    gap: spacing.xs,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 104,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 104,
  },
  title: {
    textAlign: 'center',
  },
});
