import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamilies, fontSizes, hairline, radius, spacing, touchTarget } from '../tokens';

type StepperProps = { label: string; value: number; min: number; max: number; onChange: (value: number) => void; /** Label above the controls; fits two side by side. */ compact?: boolean };

export function Stepper({ label, value, min, max, onChange, compact = false }: StepperProps) {
  return (
    <View accessibilityLabel={`${label}: ${value}`} accessibilityRole="adjustable" accessibilityValue={{ min, max, now: value }} style={[styles.row, compact && styles.compact]}>
      <Text style={[styles.label, compact && styles.labelCompact, compact && styles.labelInset]}>{label}</Text>
      <View style={[styles.controls, compact && styles.controlsCompact]}>
        <Pressable accessibilityLabel={`${label}: меньше`} accessibilityRole="button" disabled={value <= min} onPress={() => onChange(value - 1)} style={[styles.button, value <= min && styles.off]}>
          <Text style={styles.sign}>−</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable accessibilityLabel={`${label}: больше`} accessibilityRole="button" disabled={value >= max} onPress={() => onChange(value + 1)} style={[styles.button, value >= max && styles.off]}>
          <Text style={styles.sign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.md, height: touchTarget, justifyContent: 'center', width: touchTarget },
  compact: { flex: 1, flexDirection: 'column', alignItems: 'stretch', gap: spacing.xxs, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  controlsCompact: { alignSelf: 'stretch', gap: spacing.xs, justifyContent: 'space-between' },
  labelInset: { paddingLeft: spacing.xs },
  labelCompact: { flex: 0, fontSize: fontSizes.bodySmall, color: colors.textMuted },
  controls: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  label: { color: colors.text, flex: 1, fontFamily: fontFamilies.medium, fontSize: fontSizes.body },
  off: { opacity: 0.35 },
  row: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.divider, borderRadius: radius.lg, borderWidth: hairline, flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  sign: { color: colors.text, fontFamily: fontFamilies.bold, fontSize: 24, lineHeight: 28 },
  value: { color: colors.text, fontFamily: fontFamilies.bold, fontSize: fontSizes.titleSmall, minWidth: 28, textAlign: 'center' },
});
