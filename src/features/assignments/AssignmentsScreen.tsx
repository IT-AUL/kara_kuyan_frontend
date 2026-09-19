import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  ListRow,
  Screen,
  SearchBar,
  SegmentedTabs,
  StatusPill,
} from '@/design-system';
import { spacing } from '@/design-system/tokens';

const TABS = ['Мои тесты', 'Банк заданий'] as const;

const myTests = [
  { title: 'Контрольная работа №3', detail: '8 заданий · 2 варианта', status: 'Проверка в процессе', tone: 'warning' as const },
  { title: 'Куплек сан', detail: '5 сыйныф · Татар теле\n6 заданий · 15 мин', status: 'Готово', tone: 'success' as const },
  { title: 'Тартым кушымчалары', detail: '7-А · Склонение\n10 заданий · 3 варианта', status: 'Черновик', tone: 'neutral' as const },
] as const;

const bankTests = [
  { title: 'Исем килешләре', detail: '10 заданий · база', status: 'Готов', tone: 'success' as const },
  { title: 'Чыгыш килеше: мини-тест', detail: '6 заданий · повторение', status: 'Готов', tone: 'success' as const },
  { title: 'Килеш ахырлары', detail: '10 заданий · база', status: 'Готов', tone: 'success' as const },
] as const;

export function AssignmentsScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const tests = activeTab === 0 ? myTests : bankTests;

  return (
    <Screen
      edges={['top']}
      footer={
        <Button icon="task" title="Создать тест" />
      }
    >
      <SearchBar placeholder="Поиск по тестам..." />

      <SegmentedTabs activeIndex={activeTab} onTabChange={setActiveTab} tabs={TABS} />

      <View style={styles.section}>
        <Card style={styles.list}>
          {tests.map((test, index) => (
            <ListRow
              icon="library"
              isLast={index === tests.length - 1}
              key={test.title}
              onPress={() => {}}
              right={<StatusPill label={test.status} tone={test.tone} />}
              subtitle={test.detail}
              title={test.title}
              variant="plain"
            />
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
});
