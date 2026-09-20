import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { backendApi } from '@/composition';
import { downloadAndShare } from '@/adapters/files/downloads';
import { useActiveContext } from '@/data/context';
import { useSyncState } from '@/data/syncState';
import {
  AppIcon,
  Button,
  Card,
  Notice,
  Screen,
  ScreenHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { colors, fontFamilies, radius, spacing, touchTarget } from '@/design-system/tokens';

type ExportFormat = 'xlsx' | 'csv';

export function ExportGradebookScreen() {
  const router = useRouter();
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [prepared, setPrepared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctx = useActiveContext();
  const { counts } = useSyncState();
  const unsent = counts.pending + counts.syncing + counts.failed;
  const ready = !!ctx.classId && !!ctx.assignmentId;

  const prepare = async () => {
    if (!backendApi || !ctx.classId || !ctx.assignmentId) return;
    setBusy(true);
    setError(null);
    const target = await backendApi.gradebookTarget(ctx.assignmentId, ctx.classId, format);
    const mime = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv';
    const result = await downloadAndShare(target, `gradebook-${ctx.classId}-${ctx.assignmentId}.${format}`, mime);
    setBusy(false);
    if (result.ok) setPrepared(true);
    else setError(`Не удалось получить журнал: ${result.message}`);
  };

  return (
    <Screen
      footer={
        !prepared ? (
          <Button disabled={!ready || busy} icon="export" onPress={() => void prepare()} title={busy ? 'Готовим файл…' : 'Подготовить файл'} />
        ) : (
          <Button icon="check" onPress={() => router.replace('/')} title="Готово" />
        )
      }
    >
      <ScreenHeader
        eyebrow="Экспорт"
        showBack
        subtitle={ctx.assignmentTitle && ctx.className ? `${ctx.assignmentTitle} · ${ctx.className}` : 'Выберите класс и работу'}
        title="Журнал оценок"
      />

      <Card style={styles.card}>
        <Text selectable style={textStyles.title}>
          Выберите формат
        </Text>
        <View accessibilityRole="radiogroup" style={styles.formats}>
          {(['xlsx', 'csv'] as const).map((item) => {
            const selected = item === format;
            return (
              <Pressable
                accessibilityLabel={item.toUpperCase()}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={item}
                onPress={() => {
                  setFormat(item);
                  setPrepared(false);
                }}
                style={[styles.format, selected && styles.formatSelected]}
              >
                <AppIcon
                  color={selected ? colors.background : colors.primary}
                  name="download"
                  size={24}
                />
                <Text style={[styles.formatText, selected && styles.formatTextSelected]}>
                  {item.toUpperCase()}
                </Text>
                {selected ? <AppIcon color={colors.background} name="check" size={18} /> : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={textStyles.bodySmall}>
          В файл войдут оценки учеников класса без фотографий и данных распознавания.
        </Text>
      </Card>

      {ready && ctx.progress.checkedCount === 0 ? <Notice message="В этом тесте ещё нет проверенных работ: в файле будут только заголовки." /> : null}
      {unsent > 0 ? <Notice message={`Ещё не отправлено на сервер: ${unsent}. В журнал они попадут после отправки.`} /> : null}

      {prepared ? (
        <Card style={styles.prepared}>
          <StatusPill label={`${format.toUpperCase()} подготовлен`} tone="success" />
          <Text style={textStyles.bodySmall}>Файл получен от сервера и открыт в меню «Поделиться».</Text>
        </Card>
      ) : null}
      {error ? <Notice message={error} tone="error" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  format: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: touchTarget + 36,
  },
  formatSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  formatText: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
  },
  formatTextSelected: {
    color: colors.background,
  },
  formats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  prepared: {
    backgroundColor: colors.primarySoft,
  },
});
