import { View } from 'react-native';

import { useActiveContext } from '@/data/context';
import type { RejectionReason, SheetOutcome } from '@/domain/scan/evaluate';
import { Notice } from '@/design-system';
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
    <View style={{ gap: spacing.xs }}>
      {warnings.map((w) =>
        w.kind === 'forced' ? (
          <Notice
            key="forced"
            message={`Лист проверен принудительно (${becauseText[w.because]}): по тесту «${title(w.assignmentId)}», вариант ${w.variantId}. Результат может быть неверным.`}
          />
        ) : (
          <Notice
            key="differs"
            message={`Лист от другого теста: «${title(w.sheetAssignmentId)}». Сейчас выбран «${title(w.currentAssignmentId)}». Результат сохранится в тесте листа.`}
          />
        ),
      )}
    </View>
  );
}
