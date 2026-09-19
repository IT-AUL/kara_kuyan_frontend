import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, StatusPill } from '@/design-system';
import { colors, radius, spacing } from '@/design-system/tokens';

type ScanSheetPreviewProps = {
  aligned?: boolean;
};

export function ScanSheetPreview({ aligned = true }: ScanSheetPreviewProps) {
  return (
    <View style={styles.viewport}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetLabel}>КОНТРОЛЬНАЯ РАБОТА №3</Text>
            <Text style={styles.sheetSubtle}>Исем килешләре һәм кушымчалар</Text>
          </View>
          <View style={styles.qrBlock}>
            <AppIcon color={colors.background} name="qr" size={24} />
          </View>
        </View>
        <View style={styles.lines}>
          {[0, 1, 2, 3, 4, 5].map((line) => (
            <View key={line} style={styles.lineRow}>
              <View style={styles.lineIndex} />
              <View style={[styles.line, line === 2 && styles.reviewLine]} />
            </View>
          ))}
        </View>
      </View>
      <View pointerEvents="none" style={styles.cornerTopLeft} />
      <View pointerEvents="none" style={styles.cornerTopRight} />
      <View pointerEvents="none" style={styles.cornerBottomLeft} />
      <View pointerEvents="none" style={styles.cornerBottomRight} />
      <View style={styles.status}>
        <StatusPill
          icon={aligned ? 'checkCircle' : 'scan'}
          label={aligned ? 'Лист выровнен' : 'Наведите камеру на лист'}
          tone={aligned ? 'success' : 'neutral'}
        />
      </View>
    </View>
  );
}

const corner = {
  borderColor: colors.primary,
  borderRadius: 4,
  height: 42,
  position: 'absolute',
  width: 42,
} as const;

const styles = StyleSheet.create({
  cornerBottomLeft: {
    ...corner,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 18,
    left: 18,
  },
  cornerBottomRight: {
    ...corner,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 18,
    right: 18,
  },
  cornerTopLeft: {
    ...corner,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    left: 18,
    top: 18,
  },
  cornerTopRight: {
    ...corner,
    borderRightWidth: 3,
    borderTopWidth: 3,
    right: 18,
    top: 18,
  },
  line: {
    backgroundColor: colors.divider,
    borderRadius: radius.pill,
    flex: 1,
    height: 12,
  },
  lineIndex: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    height: 12,
    width: 22,
  },
  lineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lines: {
    gap: spacing.sm,
  },
  qrBlock: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  reviewLine: {
    backgroundColor: colors.warning,
  },
  sheet: {
    aspectRatio: 0.72,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    gap: spacing.lg,
    marginHorizontal: spacing.xxxl,
    marginVertical: spacing.lg,
    padding: spacing.lg,
  },
  sheetHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetLabel: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sheetSubtle: {
    color: colors.paperMuted,
    fontSize: 10,
    marginTop: 4,
  },
  status: {
    alignItems: 'center',
    bottom: spacing.lg,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  viewport: {
    backgroundColor: colors.scanBackdrop,
    borderRadius: radius.xl,
    justifyContent: 'center',
    minHeight: 390,
    overflow: 'hidden',
  },
});
