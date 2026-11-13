import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CameraPreview, ocrEngine } from '@/composition';
import { useActiveContext } from '@/data/context';
import { textStyles } from '@/design-system';
import { colors, spacing } from '@/design-system/tokens';
import type { AlignmentHint, AlignmentPhase } from '@/ports/ocr-engine';
import { ScanHud, type ZoomPreset } from './components/ScanHud';
import { scanSession } from './scanSession';

const hintLabel: Record<AlignmentHint, string> = {
  'move-away': 'Покажите все четыре угла листа',
  'move-closer': 'Приблизьте лист',
  'hold-steady': 'Держите телефон неподвижно',
  blurry: 'Изображение нечёткое — нажмите на лист',
  glare: 'Уберите блик света с листа',
  'too-dark': 'Мало света — включите кнопку «Свет»',
  tilted: 'Держите телефон параллельно листу',
};

const LOCKED_EVENTS_TO_CAPTURE = 2;

export function ScanScreen() {
  const router = useRouter();
  const { progress } = useActiveContext();
  const [focused, setFocused] = useState(false);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [phase, setPhase] = useState<AlignmentPhase>('searching');
  const [hint, setHint] = useState<AlignmentHint | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasFlash, setHasFlash] = useState(true);
  const [zoomRatio, setZoomRatio] = useState<ZoomPreset>(1);
  const [maxZoomRatio, setMaxZoomRatio] = useState(4);
  const lockedCount = useRef(0);
  const triggered = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setTorchEnabled(false);
      setZoomRatio(1);
      triggered.current = false;
      lockedCount.current = 0;
      void ocrEngine.ensureCameraPermission().then((ok) => setPermission(ok ? 'granted' : 'denied'));
      return () => {
        setFocused(false);
        setTorchEnabled(false);
        setZoomRatio(1);
      };
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

  const toggleTorch = useCallback(async () => {
    const desired = !torchEnabled;
    const actual = await scanSession.setTorch(desired);
    setTorchEnabled(actual);
  }, [torchEnabled]);

  const selectZoom = useCallback(async (preset: ZoomPreset) => {
    setZoomRatio(preset);
    const applied = await scanSession.setZoom(preset);
    setZoomRatio(applied >= 1.2 ? 1.4 : 1);
  }, []);

  useEffect(() => {
    if (!focused || permission !== 'granted') return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    let capTimer: ReturnType<typeof setTimeout> | undefined;
    const pollCapabilities = (attempt = 0) => {
      void scanSession
        .getCameraCapabilities()
        .then((caps) => {
          if (cancelled) return;
          if (caps.ready === false && attempt < 8) {
            capTimer = setTimeout(() => pollCapabilities(attempt + 1), 350);
            return;
          }
          setHasFlash(caps.hasFlash);
          setMaxZoomRatio(caps.maxZoomRatio);
        })
        .catch(() => {});
    };
    capTimer = setTimeout(() => pollCapabilities(0), 250);

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
      clearTimeout(capTimer);
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
        hasFlash={hasFlash}
        hint={hint ? hintLabel[hint] : null}
        locked={locked}
        maxZoomRatio={maxZoomRatio}
        onCapture={capture}
        onClose={() => router.back()}
        onDone={() => router.replace('/checking')}
        onImport={() => void importFile()}
        onSelectZoom={(preset) => void selectZoom(preset)}
        onToggleTorch={() => void toggleTorch()}
        torchEnabled={torchEnabled}
        total={progress.studentCount}
        zoomRatio={zoomRatio}
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
