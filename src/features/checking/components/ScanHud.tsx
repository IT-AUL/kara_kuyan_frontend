import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, textStyles } from '@/design-system';
import { colors, fontFamilies, fontSizes, radius, spacing } from '@/design-system/tokens';

export type ScanHudProps = {
  checked: number;
  total: number;
  locked: boolean;
  hint: string | null;
  canCapture: boolean;
  onClose: () => void;
  onDone: () => void;
  onCapture: () => void;
  onImport: () => void;
};

export function ScanHud({
  checked,
  total,
  locked,
  hint,
  canCapture,
  onClose,
  onDone,
  onCapture,
  onImport,
}: ScanHudProps) {
  const insets = useSafeAreaInsets();
  const fillPercent = total > 0 ? Math.min(100, Math.max(0, (checked / total) * 100)) : 0;
  const hintText = locked ? 'Держите' : (hint ?? 'Положите лист целиком в рамку');

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="box-none" style={[styles.topArea, { top: insets.top + spacing.xs }]}>
        <View pointerEvents="box-none" style={styles.topRow}>
          <Pressable
            accessibilityLabel="Закрыть"
            accessibilityRole="button"
            hitSlop={4}
            onPress={onClose}
            style={({ pressed }) => [styles.glass, styles.closeButton, pressed && styles.pressed]}
          >
            <AppIcon color={colors.text} name="close" size={22} />
          </Pressable>

          <View style={[styles.glass, styles.counterPill]}>
            <Text style={styles.counterChecked}>{checked}</Text>
            <Text style={styles.counterTotal}>{` из ${total}`}</Text>
          </View>

          <Pressable
            accessibilityLabel="Готово"
            accessibilityRole="button"
            hitSlop={4}
            onPress={onDone}
            style={({ pressed }) => [styles.glass, styles.donePill, pressed && styles.pressed]}
          >
            <Text style={styles.doneLabel}>Готово</Text>
          </Pressable>
        </View>

        {total > 0 ? (
          <View pointerEvents="none" style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${fillPercent}%` }]} />
          </View>
        ) : null}
      </View>

      <View pointerEvents="box-none" style={[styles.bottomArea, { bottom: insets.bottom + spacing.xl }]}>
        <View pointerEvents="none" style={[styles.glass, styles.hintPill]}>
          <Text style={[styles.hintText, locked && styles.hintTextLocked]}>{hintText}</Text>
        </View>

        <View pointerEvents="box-none" style={styles.controlsRow}>
          <Pressable
            accessibilityLabel={`Проверено листов: ${checked}`}
            accessibilityRole="button"
            onPress={onDone}
            style={({ pressed }) => [styles.stackButton, pressed && styles.pressed]}
          >
            <View style={styles.stackBadge}>
              <Text style={styles.stackBadgeText}>{checked}</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityLabel="Снять вручную"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canCapture }}
            disabled={!canCapture}
            onPress={onCapture}
            style={({ pressed }) => [
              styles.shutterOuter,
              !canCapture && styles.shutterDisabled,
              pressed && canCapture && styles.pressed,
            ]}
          >
            <View style={styles.shutterInner} />
          </Pressable>

          <Pressable
            accessibilityLabel="Загрузить лист из файла"
            accessibilityRole="button"
            onPress={onImport}
            style={({ pressed }) => [styles.glass, styles.importButton, pressed && styles.pressed]}
          >
            <AppIcon color={colors.text} name="download" size={22} />
          </Pressable>
        </View>

        <Text style={[textStyles.caption, styles.caption]}>
          Снимок сделается сам, когда лист в рамке
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomArea: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  caption: {
    color: 'rgba(255,255,255,0.55)',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  controlsRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
  },
  counterChecked: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  counterPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    height: 40,
    paddingHorizontal: spacing.md,
  },
  counterTotal: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  doneLabel: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  donePill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  glass: {
    backgroundColor: 'rgba(20,26,23,0.55)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
  },
  hintPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  hintText: {
    color: colors.text,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.bodySmall,
  },
  hintTextLocked: {
    color: colors.primary,
  },
  importButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: '100%',
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.pill,
    height: 3,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    backgroundColor: colors.text,
    borderRadius: 30,
    height: 60,
    width: 60,
  },
  shutterOuter: {
    alignItems: 'center',
    borderColor: colors.text,
    borderRadius: 38,
    borderWidth: 4,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  stackBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    minWidth: 24,
    paddingHorizontal: 6,
    position: 'absolute',
    right: -10,
    top: -8,
    transform: [{ rotate: '4deg' }],
  },
  stackBadgeText: {
    color: colors.toastText,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.caption,
    fontVariant: ['tabular-nums'],
  },
  stackButton: {
    backgroundColor: colors.paper,
    borderRadius: 6,
    height: 56,
    transform: [{ rotate: '-4deg' }],
    width: 48,
  },
  topArea: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
});
