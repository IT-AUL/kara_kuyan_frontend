import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, Screen, ScreenHeader, StatusPill, textStyles } from '@/design-system';
import { spacing } from '@/design-system/tokens';
import { ScanSheetPreview } from './components/ScanSheetPreview';

export function ScanScreen() {
  const router = useRouter();

  return (
    <Screen
      footer={
        <Button
          icon="check"
          onPress={() => router.push('/processing')}
          title="Продолжить с этим листом"
        />
      }
    >
      <ScreenHeader
        eyebrow="Сканирование"
        showBack
        subtitle="Расположите весь лист внутри рамки."
        title="Выровняйте лист"
      />

      <ScanSheetPreview aligned />

      <Card style={styles.note} tone="soft">
        <StatusPill label="Обработка на устройстве" tone="info" />
        <Text style={textStyles.bodySmall}>
          Лист обрабатывается локально и сразу удаляется после проверки.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    gap: spacing.xs,
  },
});
