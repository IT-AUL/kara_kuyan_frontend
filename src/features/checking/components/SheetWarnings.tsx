import { StyleSheet, Text, View } from 'react-native';

import { useActiveContext } from '@/data/context';
import type { RejectionReason, SheetOutcome } from '@/domain/scan/evaluate';
import { Card, Tag, textStyles } from '@/design-system';
import { spacing } from '@/design-system/tokens';

const becauseText: Record<RejectionReason, string> = {
  'qr-unreadable': 'QR не прочитан',
  'unknown-assignment': 'такого теста нет на телефоне',
  'unknown-variant': 'на листе другой вариант, чем есть в тесте',
  'question-count-mismatch': 'число заданий на листе не совпало с тестом',
};

/** Amber notes under a result: the sheet is not the one the current test expects, or it was checked anyway. */
export function SheetWarnings({ outcome }: { outcome: SheetOutcome | null }) {
  const { tests } = useActiveContext();
  const title = (id: string) => tests.find((t) => t.testId === id)?.title ?? id;
  const warnings = outcome?.warnings ?? [];
  if (warnings.length === 0) return null;
  return (
    <View style={styles.list}>
      {warnings.map((w) =>
        w.kind === 'forced' ? (
          <Card key="forced" style={styles.card} tone="soft">
            <Tag icon="warning" label={becauseText[w.because]} tone="mid" />
            <Text style={textStyles.bodySmall}>
              {`Лист проверен принудительно (${becauseText[w.because]}): по тесту «${title(w.assignmentId)}», вариант ${w.variantId}. Результат может быть неверным.`}
            </Text>
          </Card>
        ) : (
          <Card key="differs" style={styles.card} tone="soft">
            <Tag icon="warning" label="Другой тест" tone="mid" />
            <Text style={textStyles.bodySmall}>
              {`Лист от другого теста: «${title(w.sheetAssignmentId)}». Сейчас выбран «${title(w.currentAssignmentId)}». Результат сохранится в тесте листа.`}
            </Text>
          </Card>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
});
