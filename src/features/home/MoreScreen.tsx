import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  Card,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { spacing } from '@/design-system/tokens';

export function MoreScreen() {
  const router = useRouter();

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        eyebrow="Ещё"
        subtitle="Класс, аналитика, экспорт и отправка результатов."
        title="Инструменты"
      />

      <View style={styles.section}>
        <SectionHeader title="Класс" />
        <Card style={styles.list}>
          <ListRow
            icon="classes"
            onPress={() => router.push('/classes')}
            subtitle="7-А · 25 учеников"
            title="Классы"
            variant="plain"
          />
          <ListRow
            icon="analytics"
            onPress={() => router.push('/analytics')}
            subtitle="Темы для повторения и рекомендация"
            title="Аналитика"
            variant="plain"
          />
          <ListRow
            icon="export"
            onPress={() => router.push('/export-gradebook')}
            subtitle="XLSX или CSV без фотографий"
            title="Экспорт журнала"
            variant="plain"
          />
          <ListRow
            icon="library"
            isLast
            onPress={() => router.push('/assignments')}
            subtitle="Готовые тесты и печать"
            title="Задания"
            variant="plain"
          />
        </Card>
      </View>

      <Card style={styles.privacy} tone="raised">
        <StatusPill label="Обработка на устройстве" tone="info" />
        <Text selectable style={textStyles.titleSmall}>
          Приватность
        </Text>
        <Text style={textStyles.bodySmall}>
          Фотографии не сохраняются и не отправляются.
        </Text>
      </Card>

      <Card style={styles.sync}>
        <Text selectable style={textStyles.titleSmall}>
          Синхронизация
        </Text>
        <StatusPill label="Ожидают отправки: 3" tone="neutral" />
        <Text style={textStyles.bodySmall}>
          Проверенные работы ждут восстановления сети. Сканирование не блокируется.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  privacy: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sync: {
    gap: spacing.xs,
  },
});
