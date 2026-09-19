import type { AlignmentState } from '@/ports/ocr-engine';

type Listener = (state: AlignmentState) => void;
const listeners = new Set<Listener>();

export const alignmentBus = {
  emit(state: AlignmentState) {
    listeners.forEach((listener) => listener(state));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
