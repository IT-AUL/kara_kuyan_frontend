import { requireNativeView } from 'expo';
import type { StyleProp, ViewStyle } from 'react-native';

import type { AlignmentPhase, AlignmentHint } from '@/ports/ocr-engine';
import { alignmentBus } from './alignmentBus';

type NativeAlignment = {
  phase: AlignmentPhase;
  markersFound: number;
  hints: AlignmentHint[];
  corners: number[] | null;
  sharpness?: number;
  stableFrames?: number;
};

type NativeProps = {
  active: boolean;
  style?: StyleProp<ViewStyle>;
  onAlignment?: (event: { nativeEvent: NativeAlignment }) => void;
};

const NativeCameraView = requireNativeView<NativeProps>('OcrNative');

/** Native camera preview. It carries no pixels to JS; alignment numbers go to the alignment bus. */
export function CameraPreview({ active, style }: { active: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <NativeCameraView
      active={active}
      onAlignment={({ nativeEvent }) => {
        const c = nativeEvent.corners;
        alignmentBus.emit({
          phase: nativeEvent.phase,
          markersFound: nativeEvent.markersFound,
          hints: nativeEvent.hints ?? [],
          corners: c ? [0, 2, 4, 6].map((i) => ({ x: c[i], y: c[i + 1] })) : null,
        });
      }}
      style={style}
    />
  );
}
