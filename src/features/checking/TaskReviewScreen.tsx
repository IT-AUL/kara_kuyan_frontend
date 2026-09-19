import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { demoReviewTask } from '@/demo/demo-data';
import {
  Button,
  Card,
  Screen,
  ScreenHeader,
  StatusPill,
  textStyles,
} from '@/design-system';
import { colors, fontFamilies, radius, spacing } from '@/design-system/tokens';

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

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button
            icon="check"
            onPress={() =>
              router.replace({ pathname: '/assessment-result', params: { reviewed: '1' } })
            }
            title="Засчитать ответ"
          />
          <Button
            icon="close"
            onPress={() =>
              router.replace({ pathname: '/assessment-result', params: { reviewed: '1' } })
            }
            title="Не засчитывать"
            variant="secondary"
          />
        </View>
      }
    >
      <ScreenHeader
        eyebrow="Проверка ответа"
        showBack
        subtitle="1 из 1 отмеченного ответа"
        title={`Задание ${demoReviewTask.number}`}
      />

      <Card style={styles.reviewCard}>
        <View style={styles.header}>
          <StatusPill label="Нужно решение" tone="warning" />
          <Text style={textStyles.caption}>Решение принимает учитель</Text>
        </View>
        <Text selectable style={textStyles.title}>
          {demoReviewTask.prompt}
        </Text>
        <CharacterCells expected={demoReviewTask.expected} recognized={demoReviewTask.recognized} />
      </Card>

      <Card tone="soft">
        <Text style={textStyles.bodySmall}>
          Отличается одна буква окончания: <Text style={styles.expected}>Д</Text> вместо{' '}
          <Text style={styles.recognized}>Т</Text>. Это типичная ошибка чыгыш килеше.
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
