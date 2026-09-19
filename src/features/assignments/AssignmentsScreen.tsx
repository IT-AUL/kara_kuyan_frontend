import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { backendApi } from '@/composition';
import { downloadAndShare } from '@/adapters/files/downloads';
import { useActiveContext } from '@/data/context';
import { bankResource, bundleResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import { session } from '@/data/session';
import { testDraft, useTestDraft } from '@/data/testDraft';
import {
  Button,
  Card,
  EmptyState,
  ListRow,
  Notice,
  Screen,
  SearchBar,
  SegmentedTabs,
  StatusPill,
} from '@/design-system';
import { spacing } from '@/design-system/tokens';

const TABS = ['Мои тесты', 'Банк заданий'] as const;

export function AssignmentsScreen() {
  const router = useRouter();
  const ctx = useActiveContext();
  const bank = useResource(bankResource);
  const draft = useTestDraft();
  const [activeTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const bundle = useResource(openId ? bundleResource(openId) : null);

  const q = query.trim().toLowerCase();
  const tests = ctx.tests.filter((t) => t.title.toLowerCase().includes(q));
  const tasks = (bank.data ?? []).filter((t) => `${t.prompt} ${t.topicName}`.toLowerCase().includes(q));

  const print = async (assignmentId: string, variant: number) => {
    if (!backendApi) return;
    setMessage('Готовим бланк…');
    const target = await backendApi.blankPdfTarget(assignmentId, variant);
    const result = await downloadAndShare(target, `${assignmentId}-v${variant}.pdf`, 'application/pdf');
    setMessage(result.ok ? null : `Не удалось получить бланк: ${result.message}`);
  };

  return (
    <Screen
      edges={['top']}
      footer={
        <Button
          icon="task"
          onPress={() => router.push('/test-form')}
          title={draft.length > 0 ? `Создать тест (${draft.length} заданий)` : 'Создать тест'}
        />
      }
    >
      <SearchBar onChangeText={setQuery} placeholder="Поиск по тестам..." value={query} />
      <SegmentedTabs activeIndex={activeTab} onTabChange={setActiveTab} tabs={TABS} />
      {ctx.testsState.offline || bank.offline ? <Notice message="Нет связи с сервером: показаны сохранённые данные." /> : null}
      {message ? <Notice message={message} tone="info" /> : null}

      {activeTab === 0 ? (
        tests.length === 0 ? (
          <EmptyState
            actionLabel="Создать тест"
            body="Соберите тест из банка заданий — бланк для печати создаст сервер."
            icon="library"
            onAction={() => router.push('/test-form')}
            title="Пока нет тестов"
          />
        ) : (
          <View style={styles.section}>
            <Card style={styles.list}>
              {tests.map((test, index) => (
                <ListRow
                  icon="library"
                  isLast={index === tests.length - 1}
                  key={test.testId}
                  onPress={() => setOpenId(openId === test.testId ? null : test.testId)}
                  right={test.testId === ctx.assignmentId ? <StatusPill label="Текущий" tone="info" /> : undefined}
                  subtitle={`${test.questionsCount} заданий · ${test.gradeLevel} класс`}
                  title={test.title}
                  variant="plain"
                />
              ))}
            </Card>
            {openId ? (
              <Card style={styles.actions} tone="raised">
                <Button
                  disabled={openId === ctx.assignmentId}
                  icon="check"
                  onPress={() => session.selectAssignment(openId)}
                  title={openId === ctx.assignmentId ? 'Уже текущий' : 'Сделать текущим для проверки'}
                />
                {bundle.status === 'error' ? <Notice message="Бланк для этого теста недоступен: сервер не отдаёт его пакет." tone="error" /> : null}
                {(bundle.data?.variants ?? []).map((v) => (
                  <Button
                    icon="export"
                    key={v.variantId}
                    onPress={() => void print(openId, v.variantId)}
                    title={`Бланк (PDF), вариант ${v.variantId}`}
                    variant="secondary"
                  />
                ))}
              </Card>
            ) : null}
          </View>
        )
      ) : (
        <View style={styles.section}>
          {bank.status === 'error' ? <Notice actionLabel="Повторить" message="Не удалось загрузить банк заданий." onAction={() => void bank.refresh()} tone="error" /> : null}
          <Card style={styles.list}>
            {tasks.map((t, index) => (
              <ListRow
                icon="task"
                isLast={index === tasks.length - 1}
                key={t.taskId}
                onPress={() => testDraft.toggle(t.taskId)}
                right={<StatusPill label={draft.includes(t.taskId) ? 'Выбрано' : `${t.cellCount} кл.`} tone={draft.includes(t.taskId) ? 'success' : 'neutral'} />}
                subtitle={`${t.topicName} · ${t.gradeLevel} класс`}
                title={t.prompt}
                variant="plain"
              />
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  list: { paddingBottom: spacing.xs, paddingTop: spacing.xs },
  section: { gap: spacing.sm },
});
