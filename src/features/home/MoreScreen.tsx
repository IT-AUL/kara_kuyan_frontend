import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import { retryFailedSheets, useSyncState } from '@/data/syncState';

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

export function MoreScreen() {
  const router = useRouter();
  const ctx = useActiveContext();
  const { counts } = useSyncState();
  const waiting = counts.pending + counts.syncing;

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
            subtitle={ctx.className ? `${ctx.className} · ${ctx.progress.studentCount} учеников` : 'Создайте класс'}
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
            subtitle="Конструктор, бланки для печати"
            title="Тесты"
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
          Листы учеников не сохраняются и не отправляются: разбор идёт на телефоне. Фото задания из учебника уходит на сервер только с вашего согласия.
        </Text>
      </Card>

      <Card style={styles.sync}>
        <Text selectable style={textStyles.titleSmall}>
          Синхронизация
        </Text>
        <StatusPill
          label={counts.failed > 0 ? `Не отправлено: ${counts.failed}` : waiting > 0 ? `Ожидают отправки: ${waiting}` : 'Всё отправлено'}
          tone={counts.failed > 0 ? 'warning' : waiting > 0 ? 'neutral' : 'success'}
        />
        <Text style={textStyles.bodySmall}>
          {waiting > 0 || counts.failed > 0 ? 'Проверенные работы отправятся, когда появится связь. Сканирование не блокируется.' : 'Проверенные работы сохранены на сервере.'}
        </Text>
        {counts.failed > 0 ? <Button onPress={() => void retryFailedSheets()} title="Повторить отправку" variant="secondary" /> : null}
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
