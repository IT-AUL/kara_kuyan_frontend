import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { downloadAndShare } from '@/adapters/files/downloads';
import { backendApi } from '@/composition';
import { useActiveContext } from '@/data/context';
import { useSyncState } from '@/data/syncState';
import {
  AppIcon,
  Button,
  Card,
  colors,
  fontFamilies,
  GradePill,
  hairline,
  Notice,
  radius,
  Screen,
  ScreenHeader,
  spacing,
  StatusPill,
  textStyles,
  touchTarget,
} from '@/design-system';

type ExportFormat = 'xlsx' | 'csv';

function toGrade(grade: number): 2 | 3 | 4 | 5 {
  if (grade >= 5) return 5;
  if (grade === 4) return 4;
  if (grade === 3) return 3;
  return 2;
}

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

  const studentRows = useMemo(() => {
    const byStudentId = new Map<string, (typeof ctx.submissions)[number]>();
    for (const sub of ctx.submissions) {
      if (!byStudentId.has(sub.studentId)) {
        byStudentId.set(sub.studentId, sub);
      }
    }

    const ordered: { id: string; name: string; grade: 2 | 3 | 4 | 5 }[] = [];
    for (const student of ctx.students) {
      const sub = byStudentId.get(student.studentId);
      if (sub) {
        ordered.push({
          id: student.studentId,
          name: student.fullName,
          grade: toGrade(sub.grade),
        });
        byStudentId.delete(student.studentId);
      }
    }

    for (const sub of byStudentId.values()) {
      ordered.push({
        id: sub.studentId || sub.uuid,
        name: sub.studentName,
        grade: toGrade(sub.grade),
      });
    }

    return ordered;
  }, [ctx.students, ctx.submissions]);

  const visibleStudents = studentRows.slice(0, 5);
  const remainingCount = Math.max(0, studentRows.length - visibleStudents.length);

  const prepare = async () => {
    if (!backendApi || !ctx.classId || !ctx.assignmentId) return;
    setBusy(true);
    setError(null);
    const target = await backendApi.gradebookTarget(ctx.assignmentId, ctx.classId, format);
    const mime =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
    const result = await downloadAndShare(
      target,
      `gradebook-${ctx.classId}-${ctx.assignmentId}.${format}`,
      mime,
    );
    setBusy(false);
    if (result.ok) setPrepared(true);
    else setError(`Не удалось получить журнал: ${result.message}`);
  };

  return (
    <Screen
      footer={
        <>
          {!prepared ? (
            <Button
              disabled={!ready || busy}
              icon="export"
              onPress={() => void prepare()}
              title={busy ? 'Готовим файл…' : 'Скопировать колонку'}
              variant="primary"
            />
          ) : (
            <Button
              icon="check"
              onPress={() => router.replace('/')}
              title="Скопировано"
              variant="primary"
            />
          )}
          <Button
            disabled={!ready || busy}
            icon="download"
            onPress={() => void prepare()}
            title={`Скачать ${format.toUpperCase()}`}
            variant="ghost"
          />
        </>
      }
    >
      <ScreenHeader
        showBack
        subtitle={
          ctx.assignmentTitle && ctx.className
            ? `${ctx.assignmentTitle} · ${ctx.className}`
            : 'Выберите класс и работу'
        }
        title="В электронный журнал"
      />

      <Card style={styles.studentsCard} tone="raised">
        {visibleStudents.length > 0 ? (
          <>
            {visibleStudents.map((row, index) => {
              const showDivider =
                index < visibleStudents.length - 1 || remainingCount > 0;
              return (
                <View
                  key={row.id}
                  style={[styles.studentRow, showDivider && styles.studentDivider]}
                >
                  <Text style={styles.studentName}>{row.name}</Text>
                  <GradePill grade={row.grade} size={28} />
                </View>
              );
            })}
            {remainingCount > 0 ? (
              <Text style={styles.moreText}>{`и ещё ${remainingCount}`}</Text>
            ) : null}
          </>
        ) : (
          <Text style={textStyles.bodySmall}>Пока нет проверенных работ</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text selectable style={textStyles.titleSmall}>
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

      {ready && ctx.progress.checkedCount === 0 ? (
        <Notice message="В этом тесте ещё нет проверенных работ: в файле будут только заголовки." />
      ) : null}
      {unsent > 0 ? (
        <Notice
          message={`Ещё не отправлено на сервер: ${unsent}. В журнал они попадут после отправки.`}
        />
      ) : null}

      {prepared ? (
        <Card style={styles.prepared}>
          <StatusPill label={`${format.toUpperCase()} подготовлен`} tone="success" />
          <Text style={textStyles.bodySmall}>
            Файл получен от сервера и открыт в меню «Поделиться».
          </Text>
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
  moreText: {
    ...textStyles.caption,
    paddingTop: spacing.xs,
  },
  prepared: {
    backgroundColor: colors.primarySoft,
  },
  studentDivider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: hairline,
  },
  studentName: {
    ...textStyles.bodySmall,
    color: colors.text,
    flex: 1,
  },
  studentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  studentsCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
