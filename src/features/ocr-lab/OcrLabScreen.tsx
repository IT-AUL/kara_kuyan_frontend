import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ocrLab } from '@/adapters/ocr-native';
import { session } from '@/data/session';
import { colors, spacing, textStyles } from '@/design-system';
import type { SheetOutcome } from '@/domain/scan/evaluate';
import { scanSession } from '@/features/checking/scanSession';
import { notificationCenter } from '@/features/notifications/notificationCenter';
import { atomicityCheck, clearAll, goOnlineAndDrain, offlineBatch, outboxStatus, slowSend } from './outboxLab';

function buildCleanDemoOutcome(): SheetOutcome {
  const mkCells = (word: string) =>
    Array.from(word).map((ch, index) => ({
      index,
      expected: ch,
      predicted: ch,
      confidence: 0.98,
      verdict: 'match' as const,
      top3: [{ char: ch, confidence: 0.98 }],
    }));

  return {
    check: { ok: true },
    assignmentId: 'demo-v4',
    variant: 1,
    qrRecognised: true,
    studentNameText: 'ГАЛИЕВА АЙСЫЛУ',
    tasks: [
      { number: 1, markerId: 11, prompt: 'Переведите «школа» (в направительном падеже)', topicTag: 'аффиксы', expected: 'МӘКТӘПКӘ', recognized: 'МӘКТӘПКӘ', status: 'correct', cells: mkCells('МӘКТӘПКӘ') },
      { number: 2, markerId: 12, prompt: 'Множественное число слова «день»', topicTag: 'сингармонизм', expected: 'КӨННӘР', recognized: 'КӨННӘР', status: 'correct', cells: mkCells('КӨННӘР') },
      { number: 3, markerId: 13, prompt: 'Переведите «песня»', topicTag: 'лексика', expected: 'ҖЫР', recognized: 'ҖЫР', status: 'correct', cells: mkCells('ҖЫР') },
      { number: 4, markerId: 14, prompt: 'Переведите «родной язык»', topicTag: 'лексика', expected: 'ТУГАН ТЕЛ', recognized: 'ТУГАН ТЕЛ', status: 'correct', cells: mkCells('ТУГАН ТЕЛ') },
    ],
  };
}

function buildReviewDemoOutcome(): SheetOutcome {
  return {
    check: { ok: true },
    assignmentId: 'demo-v4',
    variant: 2,
    qrRecognised: true,
    studentNameText: 'САФИН КАМИЛЬ',
    tasks: [
      {
        number: 1,
        markerId: 11,
        prompt: 'Вставьте верные гласные: «в школу»',
        topicTag: 'сингармонизм',
        expected: 'МӘКТӘПКӘ',
        recognized: 'МӘКТӘПКА',
        status: 'review',
        cells: [
          { index: 0, expected: 'М', predicted: 'М', confidence: 0.99, verdict: 'match', top3: [{ char: 'М', confidence: 0.99 }] },
          { index: 1, expected: 'Ә', predicted: 'Ә', confidence: 0.96, verdict: 'match', top3: [{ char: 'Ә', confidence: 0.96 }] },
          { index: 2, expected: 'К', predicted: 'К', confidence: 0.99, verdict: 'match', top3: [{ char: 'К', confidence: 0.99 }] },
          { index: 3, expected: 'Т', predicted: 'Т', confidence: 0.98, verdict: 'match', top3: [{ char: 'Т', confidence: 0.98 }] },
          { index: 4, expected: 'Ә', predicted: 'Ә', confidence: 0.94, verdict: 'match', top3: [{ char: 'Ә', confidence: 0.94 }] },
          { index: 5, expected: 'П', predicted: 'П', confidence: 0.99, verdict: 'match', top3: [{ char: 'П', confidence: 0.99 }] },
          { index: 6, expected: 'К', predicted: 'К', confidence: 0.99, verdict: 'match', top3: [{ char: 'К', confidence: 0.99 }] },
          {
            index: 7,
            expected: 'Ә',
            predicted: 'А',
            confidence: 0.74,
            verdict: 'uncertain',
            top3: [
              { char: 'А', confidence: 0.74 },
              { char: 'Ә', confidence: 0.21 },
              { char: 'Э', confidence: 0.04 },
            ],
          },
        ],
      },
      {
        number: 2,
        markerId: 12,
        prompt: 'Переведите «утка»',
        topicTag: 'лексика',
        expected: 'ҮРДӘК',
        recognized: 'ҮРДӘК',
        status: 'correct',
        cells: Array.from('ҮРДӘК').map((ch, index) => ({
          index,
          expected: ch,
          predicted: ch,
          confidence: 0.97,
          verdict: 'match' as const,
          top3: [{ char: ch, confidence: 0.97 }],
        })),
      },
    ],
  };
}

/** Dev-only harness for the OCR v4 benchmark & UI preview. Reachable by deep link `karakuyan://ocr-lab`, not from navigation. */
export function OcrLabScreen() {
  const router = useRouter();
  const [output, setOutput] = useState('Готов.');
  const [busy, setBusy] = useState(false);
  const { run: auto, n } = useLocalSearchParams<{ run?: string; n?: string }>();

  const ensureSignedIn = async () => {
    if (!session.getState().profile) {
      await session.signIn('Гөлнара Ильдаровна', 'Гимназия №2');
    }
  };

  const actions: readonly [key: string, label: string, job: () => Promise<unknown>][] = [
    ['info', 'Информация о модуле', ocrLab.info],
    ['selftest', 'Сверка с golden', ocrLab.selfTest],
    ['sheets', 'Листы v4 (12 бланков, геометрия + OCR)', () => ocrLab.sheetTest(3)],
    ['bench', 'Замер v4 (лист, 72 клетки)', () => ocrLab.benchmark(72, 20)],
    [
      'open-home',
      'UI: Главная (колокольчик уведомлений)',
      async () => {
        await ensureSignedIn();
        router.replace('/');
        return { opened: 'home' };
      },
    ],
    [
      'open-notifications',
      'UI: Центр уведомлений и новостей',
      async () => {
        await ensureSignedIn();
        router.replace('/notifications');
        return { opened: 'notifications' };
      },
    ],
    [
      'send-test-notif',
      'Уведомления: отправить тестовый баннер Android',
      async () => {
        await ensureSignedIn();
        await notificationCenter.init();
        const perm = await notificationCenter.sendTestNotification();
        return { permission: perm, sent: perm === 'granted' };
      },
    ],
    [
      'demo-clean',
      'UI: Zero-Touch (100% чисто)',
      async () => {
        await ensureSignedIn();
        scanSession.seedForDev(
          buildCleanDemoOutcome(),
          { id: 'st-1', name: 'Галиева Айсылу', code: 'st-1', variant: 1 },
          184,
        );
        router.replace('/assessment-result');
        return { seeded: 'clean' };
      },
    ],
    [
      'demo-review',
      'UI: Spot-Focus (<85% + Top-3)',
      async () => {
        await ensureSignedIn();
        scanSession.seedForDev(
          buildReviewDemoOutcome(),
          { id: 'st-2', name: 'Сафин Камиль', code: 'st-2', variant: 2 },
          212,
        );
        router.replace('/task-review');
        return { seeded: 'review' };
      },
    ],
    [
      'demo-result-review',
      'UI: Результат с жёлтой ячейкой',
      async () => {
        await ensureSignedIn();
        scanSession.seedForDev(
          buildReviewDemoOutcome(),
          { id: 'st-2', name: 'Сафин Камиль', code: 'st-2', variant: 2 },
          212,
        );
        router.replace('/assessment-result');
        return { seeded: 'result-review' };
      },
    ],
    ['status', 'Outbox: статус', outboxStatus],
    ['offline25', 'Outbox: 25 листов без сети', () => offlineBatch(25)],
    ['drain', 'Outbox: сеть вкл и отправить', () => goOnlineAndDrain()],
    ['slow', 'Outbox: медленная отправка', slowSend],
    ['clear', 'Outbox: очистить', clearAll],
    ['atomic', 'Outbox: атомарность', atomicityCheck],
  ];

  const run = async (label: string, job: () => Promise<unknown>) => {
    setBusy(true);
    setOutput(`${label}…`);
    try {
      const result = JSON.stringify(await job(), null, 2);
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

  useEffect(() => {
    const action = actions.find(([key]) => key === auto);
    if (!action) return undefined;
    const timer = setTimeout(() => void run(action[1], action[2]), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, n]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xxxl, gap: spacing.md }}
    >
      <Text style={textStyles.title}>OCR lab (dev)</Text>
      {actions.map(([, label, job]) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          disabled={busy}
          onPress={() => run(label, job)}
          style={{
            minHeight: 48,
            borderRadius: 12,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Text style={{ ...textStyles.body, color: colors.background }}>{label}</Text>
        </Pressable>
      ))}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md }}>
        <Text selectable style={{ ...textStyles.bodySmall, fontFamily: 'monospace' }}>
          {output}
        </Text>
      </View>
    </ScrollView>
  );
}
