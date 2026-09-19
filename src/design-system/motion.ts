import { Easing, useReducedMotion } from 'react-native-reanimated';

/** Shared motion tokens. `reduced` follows the system "reduce motion" setting: no entrance, no count-up, no pulses. */
export const motion = {
  enterMs: 380,
  staggerMs: 70,
  countUpMs: 700,
  easeOut: Easing.out(Easing.cubic),
} as const;

export function useMotion() {
  return { reduced: useReducedMotion(), ...motion };
}
