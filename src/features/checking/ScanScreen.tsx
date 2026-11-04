import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CameraPreview, ocrEngine } from '@/composition';
import { useActiveContext } from '@/data/context';
import { textStyles } from '@/design-system';
import { colors, spacing } from '@/design-system/tokens';
import type { AlignmentHint, AlignmentPhase } from '@/ports/ocr-engine';
import { ScanHud } from './components/ScanHud';
import { scanSession } from './scanSession';

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
  const { progress } = useActiveContext();
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
    <View style={styles.root}>
      {permission === 'granted' ? (
        <CameraPreview active={focused} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.denied}>
          <Text style={[textStyles.body, styles.deniedText]}>
            {permission === 'denied' ? 'Нужен доступ к камере, чтобы проверять работы.' : 'Запрашиваем доступ к камере…'}
          </Text>
        </View>
      )}

      <ScanHud
        canCapture={permission === 'granted'}
        checked={progress.checkedCount}
        hint={hint ? hintLabel[hint] : null}
        locked={locked}
        onCapture={capture}
        onClose={() => router.back()}
        onDone={() => router.replace('/checking')}
        onImport={() => void importFile()}
        total={progress.studentCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  denied: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  deniedText: {
    color: colors.text,
    textAlign: 'center',
  },
  root: {
    backgroundColor: colors.scanBackdrop,
    flex: 1,
  },
});
