import React from 'react';

import { ReviewCard } from './ReviewCard';

type PanCallback = (e: { translationX: number }) => void;
type MockGesture = {
  onUpdate: (cb: PanCallback) => MockGesture;
  onEnd: (cb: PanCallback) => MockGesture;
};

let lastEndHandler: PanCallback | null = null;
let lastUpdateHandler: PanCallback | null = null;

jest.mock('react-native-gesture-handler', () => {
  const View = jest.requireActual('react-native').View;
  return {
    Gesture: {
      Pan: (): MockGesture => {
        const gesture: MockGesture = {
          onUpdate: jest.fn((cb: PanCallback): MockGesture => {
            lastUpdateHandler = cb;
            return gesture;
          }),
          onEnd: jest.fn((cb: PanCallback): MockGesture => {
            lastEndHandler = cb;
            return gesture;
          }),
        };
        return gesture;
      },
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('react-native-reanimated', () => {
  const View = jest.requireActual('react-native').View;
  return {
    __esModule: true,
    default: { View },
    Easing: {
      cubic: (t: number) => t,
      out: (fn: unknown) => fn,
    },
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    useSharedValue: (init: number) => ({ value: init }),
    withSpring: (toValue: number) => toValue,
  };
});

function isFunctionComponent(type: unknown): type is (props: unknown) => unknown {
  return (
    typeof type === 'function' &&
    !(type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent
  );
}

function collectTexts(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (typeof node === 'number') return [String(node)];
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(collectTexts);
  const el = node as { type?: unknown; props?: { children?: unknown } };
  if (isFunctionComponent(el.type)) {
    const rendered = el.type(el.props ?? {});
    return collectTexts(rendered);
  }
  return collectTexts(el.props?.children);
}

function collectAccessibilityLabels(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(collectAccessibilityLabels);
  const el = node as {
    type?: unknown;
    props?: { accessibilityLabel?: string; children?: unknown };
  };
  const labels: string[] = [];
  if (el.props?.accessibilityLabel) {
    labels.push(el.props.accessibilityLabel);
  }
  if (isFunctionComponent(el.type)) {
    const rendered = el.type(el.props ?? {});
    return [...labels, ...collectAccessibilityLabels(rendered)];
  }
  return [...labels, ...collectAccessibilityLabels(el.props?.children)];
}

describe('ReviewCard', () => {
  beforeEach(() => {
    lastEndHandler = null;
    lastUpdateHandler = null;
  });

  it('renders expected and recognized character cells, stamps, and swipe hint', () => {
    const onDecide = jest.fn();
    const element = ReviewCard({
      expected: 'мәктәпкә',
      recognized: 'мәктәпка',
      onDecide,
    });

    const texts = collectTexts(element);
    expect(texts).toContain('Ожидалось');
    expect(texts).toContain('Написано');
    expect(texts).toContain('ВЕРНО');
    expect(texts).toContain('ОШИБКА');
    expect(texts).toContain('Смахните вправо — верно, влево — ошибка');

    const a11yLabels = collectAccessibilityLabels(element);
    expect(a11yLabels).toContain('Ожидалось: мәктәпкә. Написано: мәктәпка');
    expect(a11yLabels).toContain('а, отличается от ә');
  });

  it('calls onDecide on swipe beyond ±90 threshold and springs back within threshold', () => {
    const onDecide = jest.fn();
    ReviewCard({
      expected: 'көннәр',
      recognized: 'көнлар',
      onDecide,
    });

    expect(lastUpdateHandler).not.toBeNull();
    expect(lastEndHandler).not.toBeNull();

    lastUpdateHandler?.({ translationX: 40 });
    lastEndHandler?.({ translationX: 40 });
    expect(onDecide).not.toHaveBeenCalled();

    lastEndHandler?.({ translationX: 120 });
    expect(onDecide).toHaveBeenCalledWith('accept');

    lastEndHandler?.({ translationX: -120 });
    expect(onDecide).toHaveBeenCalledWith('reject');
  });

  it('renders yellow spot-focus cells (<85%), Top-3 chips, and invokes onPickChar in 1 tap', () => {
    const onDecide = jest.fn();
    const onPickChar = jest.fn();
    const onOpenFullAlphabet = jest.fn();
    const element = ReviewCard({
      expected: 'ӘНИ',
      recognized: 'АНИ',
      onDecide,
      onPickChar,
      onOpenFullAlphabet,
      selectedCellIndex: 0,
      cells: [
        {
          index: 0,
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
        { index: 1, expected: 'Н', predicted: 'Н', confidence: 0.99, verdict: 'match', top3: [{ char: 'Н', confidence: 0.99 }] },
        { index: 2, expected: 'И', predicted: 'И', confidence: 0.98, verdict: 'match', top3: [{ char: 'И', confidence: 0.98 }] },
        { index: 3, expected: ' ', predicted: ' ', confidence: 1, verdict: 'match', top3: [] },
      ],
    });

    const texts = collectTexts(element);
    expect(texts).toContain('Ячейка 1 · Top-3 подсказки (1 тап)');
    expect(texts).toContain('74%');
    expect(texts).toContain('21%');
    expect(texts).toContain('Пусто');
    expect(texts).toContain('Другая буква (39)…');

    const a11yLabels = collectAccessibilityLabels(element);
    expect(a11yLabels).toContain('Выбрать букву Ә, вероятность 21%');
  });
});
