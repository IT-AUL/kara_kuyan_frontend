import { ScanHud, type ScanHudProps } from './ScanHud';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));

jest.mock('expo-symbols', () => {
  const View = jest.requireActual('react-native').View;
  return {
    SymbolView: () => <View />,
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
    ZoomIn: { duration: () => ({}) },
  };
});

type ElementLike = {
  type?: unknown;
  props?: {
    accessibilityLabel?: string;
    accessibilityState?: { disabled?: boolean; selected?: boolean };
    disabled?: boolean;
    onPress?: () => void;
    children?: unknown;
  };
};

function isFunctionComponent(type: unknown): type is (props: unknown) => unknown {
  return (
    typeof type === 'function' &&
    !(type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent
  );
}

function collectElements(node: unknown): ElementLike[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(collectElements);
  const el = node as ElementLike;
  if (isFunctionComponent(el.type)) {
    return collectElements(el.type(el.props ?? {}));
  }
  return [el, ...collectElements(el.props?.children)];
}

function collectTexts(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (typeof node === 'number') return [String(node)];
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(collectTexts);
  const el = node as ElementLike;
  if (isFunctionComponent(el.type)) {
    return collectTexts(el.type(el.props ?? {}));
  }
  return collectTexts(el.props?.children);
}

function baseProps(overrides: Partial<ScanHudProps> = {}): ScanHudProps {
  return {
    checked: 4,
    total: 24,
    locked: false,
    hint: null,
    canCapture: true,
    torchEnabled: false,
    hasFlash: true,
    zoomRatio: 1,
    maxZoomRatio: 4,
    onToggleTorch: jest.fn(),
    onSelectZoom: jest.fn(),
    onClose: jest.fn(),
    onDone: jest.fn(),
    onCapture: jest.fn(),
    onImport: jest.fn(),
    ...overrides,
  };
}

describe('ScanHud optical & DQA controls (v0.4.2)', () => {
  it('renders torch toggle, 1× / 1.4× zoom presets, and tap-to-focus guidance', () => {
    const onToggleTorch = jest.fn();
    const onSelectZoom = jest.fn();
    const tree = ScanHud(baseProps({ onToggleTorch, onSelectZoom }));

    const texts = collectTexts(tree);
    expect(texts).toContain('Свет');
    expect(texts).toContain('1×');
    expect(texts).toContain('1.4×');
    expect(texts).toContain('Нажмите на лист для фокуса · снимок сделается сам в рамке');

    const elements = collectElements(tree);
    const torchBtn = elements.find((e) => e.props?.accessibilityLabel === 'Включить фонарик');
    const zoom1x = elements.find((e) => e.props?.accessibilityLabel === 'Масштаб камеры 1×');
    const zoom14x = elements.find((e) => e.props?.accessibilityLabel === 'Масштаб камеры 1.4×');

    expect(torchBtn?.props?.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(zoom1x?.props?.accessibilityState).toEqual({ disabled: false, selected: true });
    expect(zoom14x?.props?.accessibilityState).toEqual({ disabled: false, selected: false });

    torchBtn?.props?.onPress?.();
    expect(onToggleTorch).toHaveBeenCalledTimes(1);

    zoom14x?.props?.onPress?.();
    expect(onSelectZoom).toHaveBeenCalledWith(1.4);
  });

  it('reflects active torch & 1.4× crop selection and disables unsupported hardware cleanly', () => {
    const tree = ScanHud(
      baseProps({
        torchEnabled: true,
        hasFlash: false,
        zoomRatio: 1.4,
        maxZoomRatio: 1.0,
        hint: 'Уберите блик света с листа',
      }),
    );

    const texts = collectTexts(tree);
    expect(texts).toContain('Уберите блик света с листа');

    const elements = collectElements(tree);
    const torchBtn = elements.find((e) => e.props?.accessibilityLabel === 'Выключить фонарик');
    const zoom14x = elements.find((e) => e.props?.accessibilityLabel === 'Масштаб камеры 1.4×');

    expect(torchBtn?.props?.accessibilityState).toEqual({ disabled: true, selected: true });
    expect(zoom14x?.props?.accessibilityState).toEqual({ disabled: true, selected: true });
  });
});
