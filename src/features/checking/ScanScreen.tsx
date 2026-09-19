import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CameraPreview, ocrEngine } from '@/composition';
import { Button, Card, Screen, ScreenHeader, StatusPill, textStyles } from '@/design-system';
import { colors, radius, spacing } from '@/design-system/tokens';
import type { AlignmentHint, AlignmentPhase } from '@/ports/ocr-engine';
import { scanSession } from './scanSession';

const phaseLabel: Record<AlignmentPhase, string> = {
  searching: 'Ищем лист',
  aligning: 'Выравниваем',
  locked: 'Лист найден',
  capturing: 'Снимаем',
  processing: 'Обрабатываем',
};

const hintLabel: Record<AlignmentHint, string> = {
  'move-away': 'Покажите все четыре угла листа',
  'move-closer': 'Приблизьте лист',
  'hold-steady': 'Держите телефон неподвижно',
  blurry: 'Изображение нечёткое',
  glare: 'Уберите блик',
  'too-dark': 'Нужно больше света',
  tilted: 'Держите телефон ровнее',
};

const LOCKED_EVENTS_TO_CAPTURE = 3;

export function ScanScreen() {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [phase, setPhase] = useState<AlignmentPhase>('searching');
  const [hint, setHint] = useState<AlignmentHint | null>(null);
  const lockedCount = useRef(0);
  const triggered = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      triggered.current = false;
      lockedCount.current = 0;
      void ocrEngine.ensureCameraPermission().then((ok) => setPermission(ok ? 'granted' : 'denied'));
      return () => setFocused(false);
    }, []),
  );

  const capture = useCallback(() => {
    if (triggered.current) return;
    triggered.current = true;
    void scanSession.run();
    router.push('/processing');
  }, [router]);

  const importFile = useCallback(async () => {
    if (triggered.current) return;
    triggered.current = true;
    const result = await scanSession.runFromFile();
    if (result === 'cancelled') triggered.current = false;
    else router.push('/processing');
  }, [router]);

  useEffect(() => {
    if (!focused || permission !== 'granted') return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void scanSession
      .watchAlignment((state) => {
        setPhase(state.phase);
        setHint(state.hints[0] ?? null);
        lockedCount.current = state.phase === 'locked' ? lockedCount.current + 1 : 0;
        if (lockedCount.current >= LOCKED_EVENTS_TO_CAPTURE) capture();
      })
      .then((off) => {
        if (cancelled) off();
        else unsubscribe = off;
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [focused, permission, capture]);

  const locked = phase === 'locked';

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button disabled={permission !== 'granted'} icon="check" onPress={capture} title="Снять вручную" />
          <Button icon="download" onPress={() => void importFile()} title="Загрузить лист из файла" variant="secondary" />
        </View>
      }
    >
      <ScreenHeader
        eyebrow="Сканирование"
        showBack
        subtitle="Расположите весь лист внутри кадра: снимок сделается сам."
        title="Наведите на лист"
      />

      <View style={[styles.frame, locked && styles.frameLocked]}>
        {permission === 'granted' ? (
          <CameraPreview active={focused} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.denied}>
            <Text style={textStyles.body}>
              {permission === 'denied' ? 'Нужен доступ к камере, чтобы проверять работы.' : 'Запрашиваем доступ к камере…'}
            </Text>
          </View>
        )}
        <View style={styles.overlay}>
          <StatusPill label={phaseLabel[phase]} tone={locked ? 'success' : 'neutral'} />
          {hint && !locked ? <Text style={styles.hint}>{hintLabel[hint]}</Text> : null}
        </View>
      </View>

      <Card style={styles.note} tone="soft">
        <StatusPill label="Обработка на устройстве" tone="info" />
        <Text style={textStyles.bodySmall}>
          Кадры остаются в памяти телефона и сразу удаляются: фото не сохраняется и не отправляется.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  denied: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.lg },
  footer: { gap: spacing.sm },
  frame: {
    aspectRatio: 0.75,
    backgroundColor: colors.scanBackdrop,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    borderWidth: 2,
    overflow: 'hidden',
    width: '100%',
  },
  frameLocked: { borderColor: colors.primary },
  hint: { color: colors.text, fontSize: 16, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 6 },
  note: { gap: spacing.xs },
  overlay: { alignItems: 'flex-start', gap: spacing.xs, left: spacing.md, position: 'absolute', top: spacing.md },
});
