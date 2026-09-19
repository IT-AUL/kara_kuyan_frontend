import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

import { useMotion } from '@/design-system/motion';

type CountUpProps = { value: number; style?: TextStyle };

/** Counts from 0 to `value` once (integers only); shows the value at once under reduced motion. */
export function CountUp({ value, style }: CountUpProps) {
  const { reduced, countUpMs } = useMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced || value <= 0) return;
    const steps = Math.min(value, 30);
    const timer = setInterval(() => {
      setShown((current) => {
        const next = Math.min(value, current + Math.ceil(value / steps));
        if (next >= value) clearInterval(timer);
        return next;
      });
    }, countUpMs / steps);
    return () => clearInterval(timer);
  }, [reduced, value, countUpMs]);

  return (
    <Text maxFontSizeMultiplier={1.2} style={style}>
      {reduced ? value : Math.min(shown, value)}
    </Text>
  );
}
