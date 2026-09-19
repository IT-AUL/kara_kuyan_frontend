import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ocrLab } from '@/adapters/ocr-native';
import { colors, spacing, textStyles } from '@/design-system';
import { atomicityCheck, clearAll, goOnlineAndDrain, offlineBatch, outboxStatus, slowSend } from './outboxLab';

const ACTIONS: readonly [key: string, label: string, job: () => Promise<unknown>][] = [
  ['info', 'Информация о модуле', ocrLab.info],
  ['selftest', 'Сверка с golden', ocrLab.selfTest],
  ['sheets', 'Листы из файлов (геометрия + QR)', () => ocrLab.sheetTest(8)],
  ['bench', 'Замер (лист, 72 клетки)', () => ocrLab.benchmark(72, 30)],
  ['status', 'Outbox: статус', outboxStatus],
  ['offline25', 'Outbox: 25 листов без сети', () => offlineBatch(25)],
  ['drain', 'Outbox: сеть вкл и отправить', () => goOnlineAndDrain()],
  ['slow', 'Outbox: медленная отправка', slowSend],
  ['clear', 'Outbox: очистить', clearAll],
  ['atomic', 'Outbox: атомарность', atomicityCheck],
];

/** Dev-only harness for the OCR spike. Reachable by deep link `karakuyan://ocr-lab`, not from navigation. */
export function OcrLabScreen() {
  const [output, setOutput] = useState('Готов.');
  const [busy, setBusy] = useState(false);
  const { run: auto, n } = useLocalSearchParams<{ run?: string; n?: string }>();

  const run = async (label: string, job: () => Promise<unknown>) => {
    setBusy(true);
    setOutput(`${label}…`);
    try {
      const result = JSON.stringify(await job(), null, 2);
      // logcat truncates long lines: emit the compact JSON in numbered chunks
      const compact = JSON.stringify(JSON.parse(result));
      const parts = compact.match(/[\s\S]{1,3000}/g) ?? [];
      parts.forEach((part, i) => console.log(`[ocr-lab] ${label} #${i + 1}/${parts.length}: ${part}`));
      setOutput(result);
    } catch (e) {
      console.log(`[ocr-lab] ${label} failed: ${String(e)}`);
      setOutput(String(e));
    } finally {
      setBusy(false);
    }
  };

  // `karakuyan://ocr-lab?run=<key>&n=<nonce>` runs an action without tapping (used for scripted device checks)
  useEffect(() => {
    const action = ACTIONS.find(([key]) => key === auto);
    if (!action) return undefined;
    const timer = setTimeout(() => void run(action[1], action[2]), 0);
    return () => clearTimeout(timer);
  }, [auto, n]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xxxl, gap: spacing.md }}>
      <Text style={textStyles.title}>OCR lab (dev)</Text>
      {ACTIONS.map(([, label, job]) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          disabled={busy}
          onPress={() => run(label, job)}
          style={{ minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
        >
          <Text style={{ ...textStyles.body, color: colors.background }}>{label}</Text>
        </Pressable>
      ))}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md }}>
        <Text selectable style={{ ...textStyles.bodySmall, fontFamily: 'monospace' }}>{output}</Text>
      </View>
    </ScrollView>
  );
}
