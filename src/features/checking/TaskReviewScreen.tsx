import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Screen,
  ScreenHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { colors, fontFamilies, radius, spacing } from '@/design-system/tokens';
import { scanSession, useScanSession } from './scanSession';

function CharacterCells({ expected, recognized }: { expected: string; recognized: string }) {
  const expectedChars = Array.from(expected);
  const recognizedChars = Array.from(recognized);

  return (
    <View accessibilityLabel={`Ожидалось: ${expected}. Написано: ${recognized}`} style={styles.comparison}>
      <View style={styles.wordRow}>
        <Text style={styles.wordLabel}>Ожидалось</Text>
        <View accessibilityLabel={`Ожидалось: ${expected}`} style={styles.cells}>
          {expectedChars.map((char, index) => (
            <View key={`${char}-${index}`} style={styles.cell}>
              <Text style={styles.char}>{char}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.wordRow}>
        <Text style={styles.wordLabel}>Написано</Text>
        <View accessibilityLabel={`Написано: ${recognized}`} style={styles.cells}>
          {recognizedChars.map((char, index) => (
            <View
              accessibilityLabel={char !== expectedChars[index] ? `${char}, отличается от ${expectedChars[index]}` : char}
              key={`${char}-${index}`}
              style={[styles.cell, char !== expectedChars[index] && styles.cellMismatch]}
            >
              <Text style={styles.char}>{char}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function TaskReviewScreen() {
  const router = useRouter();
  const { outcome, overrides } = useScanSession();

  const flagged = outcome?.tasks.filter((t) => t.status === 'review') ?? [];
  const current = flagged.find((t) => !overrides[t.number]);
  const position = flagged.filter((t) => overrides[t.number]).length + 1;

  const decide = (verdict: 'accept' | 'reject') => {
    if (!current) return;
    scanSession.override(current.number, verdict);
    if (flagged.filter((t) => !overrides[t.number]).length <= 1) router.replace('/assessment-result');
  };

  if (!current) {
    return (
      <Screen footer={<Button icon="check" onPress={() => router.replace('/assessment-result')} title="К результату" />}>
        <ScreenHeader eyebrow="Проверка ответа" title="Всё проверено" subtitle="Отмеченных ответов больше нет." />
      </Screen>
    );
  }

  const expectedChars = Array.from(current.expected);
  const recognizedChars = Array.from(current.recognized);
  const differing = expectedChars.filter((ch, i) => ch !== recognizedChars[i]).length;

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button icon="check" onPress={() => decide('accept')} title="Засчитать ответ" />
          <Button icon="close" onPress={() => decide('reject')} title="Не засчитывать" variant="secondary" />
        </View>
      }
    >
      <ScreenHeader
        eyebrow="Проверка ответа"
        showBack
        subtitle={`${position} из ${flagged.length} отмеченных ответов`}
        title={`Задание ${current.number}`}
      />

      <Card style={styles.reviewCard}>
        <View style={styles.header}>
          <StatusPill label="Нужно решение" tone="warning" />
          <Text style={textStyles.caption}>Решение принимает учитель</Text>
        </View>
        <Text selectable style={textStyles.title}>
          {current.prompt}
        </Text>
        <CharacterCells expected={current.expected} recognized={current.recognized} />
      </Card>

      <Card tone="soft">
        <Text style={textStyles.bodySmall}>
          {differing > 0
            ? `Отличается букв: ${differing}. Сравните написанное с правильным ответом.`
            : recognizedChars.length > expectedChars.length
              ? 'После ответа есть лишний знак — возможно, помарка. Подтвердите или не засчитывайте.'
              : 'Буквы совпадают, но распознавание неуверенное — подтвердите ответ.'}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
  },
  cell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.divider,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    height: 38,
    justifyContent: 'center',
    minWidth: 0,
  },
  cellMismatch: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  cells: {
    flexDirection: 'row',
    gap: spacing.xxs,
    justifyContent: 'space-between',
    width: '100%',
  },
  char: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 18,
  },
  comparison: {
    gap: spacing.sm,
  },
  expected: {
    color: colors.successSoft,
    fontFamily: fontFamilies.bold,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recognized: {
    color: colors.warning,
    fontFamily: fontFamilies.bold,
  },
  reviewCard: {
    gap: spacing.md,
  },
  wordLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
  },
  wordRow: {
    alignItems: 'stretch',
    gap: spacing.xs,
  },
});
