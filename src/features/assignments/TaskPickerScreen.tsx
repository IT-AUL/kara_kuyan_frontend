import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bankResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import { testDraft, useTestDraft } from '@/data/testDraft';
import { uniqueTopics } from '@/domain/constructor/draft';
import { AppIcon, Button, Chips, EmptyState, Notice, Screen, ScreenHeader, SearchBar, StatusPill } from '@/design-system';
import { colors, spacing } from '@/design-system/tokens';

import { TaskRow } from './components/TaskRow';

/** Bank of ready tasks: search, filter by topic, tick, add to the test being built. */
export function TaskPickerScreen() {
  const router = useRouter();
  const bank = useResource(bankResource);
  const draft = useTestDraft();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [picked, setPicked] = useState<readonly string[]>([]);

  const all = useMemo(() => bank.data ?? [], [bank.data]);
  const inDraft = useMemo(() => new Set(draft.tasks.map((t) => t.taskId)), [draft.tasks]);
  const topics = useMemo(() => uniqueTopics(all), [all]);
  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (t) => (topic === null || t.topicTag === topic) && (q === '' || `${t.prompt} ${t.expectedAnswer} ${t.topicName}`.toLowerCase().includes(q)),
  );

  const selectable = shown.filter((t) => !inDraft.has(t.taskId));
  const allShownPicked = selectable.length > 0 && selectable.every((t) => picked.includes(t.taskId));
  const toggleAll = () =>
    setPicked((p) => (allShownPicked ? p.filter((id) => !selectable.some((t) => t.taskId === id)) : [...new Set([...p, ...selectable.map((t) => t.taskId)])]));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const add = () => {
    testDraft.addTasks(all.filter((t) => picked.includes(t.taskId)));
    router.back();
  };

  return (
    <Screen avoidKeyboard footer={<Button disabled={picked.length === 0} icon="check" onPress={add} title={picked.length > 0 ? `Добавить в тест (${picked.length})` : 'Выберите задания'} />}>
      <ScreenHeader showBack size="compact" title="Банк заданий" />
      <SearchBar onChangeText={setQuery} placeholder="Поиск по вопросу или ответу" value={query} />
      {topics.length > 1 ? (
        <Chips allLabel="Все темы" items={topics.map((t) => ({ key: t.tag, label: `${t.name} · ${t.count}` }))} onSelect={setTopic} selected={topic} />
      ) : null}
      {bank.offline ? <Notice message="Нет связи: показан сохранённый банк." /> : null}
      {bank.status === 'error' ? <Notice actionLabel="Повторить" message="Не удалось загрузить банк заданий." onAction={() => void bank.refresh()} tone="error" /> : null}

      {selectable.length > 0 ? (
        <View style={styles.bar}>
          <Text style={styles.count}>{picked.length > 0 ? `Выбрано: ${picked.length}` : `Заданий: ${shown.length}`}</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={toggleAll}><Text style={styles.all}>{allShownPicked ? 'Снять выбор' : `Выбрать все (${selectable.length})`}</Text></Pressable>
        </View>
      ) : null}
      {shown.length === 0 && bank.status !== 'loading' ? (
        <EmptyState body="Измените поиск или тему. Своё задание можно создать в конструкторе." icon="task" title="Ничего не найдено" />
      ) : (
        <View style={styles.list}>
          {shown.map((t) => {
            const already = inDraft.has(t.taskId);
            const on = picked.includes(t.taskId);
            return (
              <TaskRow
                accessibilityState={{ checked: on || already, disabled: already }}
                answer={t.expectedAnswer}
                cellCount={t.cellCount}
                dense
                key={t.taskId}
                onPress={already ? undefined : () => toggle(t.taskId)}
                prompt={t.prompt}
                right={
                  already ? (
                    <StatusPill label="В тесте" tone="neutral" />
                  ) : (
                    <View style={[styles.check, on && styles.checkOn]}>{on ? <AppIcon color={colors.background} name="check" size={18} /> : null}</View>
                  )
                }
                topicName={`${t.topicName} · ${t.gradeLevel} класс`}
              />
            );
          })}
        </View>
      )}
      
    </Screen>
  );
}

const styles = StyleSheet.create({
  all: { color: colors.primary, fontSize: 14, fontWeight: '600', padding: spacing.xs },
  bar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  count: { color: colors.textMuted, fontSize: 14 },
  check: { alignItems: 'center', borderColor: colors.textMuted, borderRadius: 8, borderWidth: 2, height: 28, justifyContent: 'center', width: 28 },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  list: { gap: spacing.sm },
});
