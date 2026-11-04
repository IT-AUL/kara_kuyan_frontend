import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamilies, fontSizes, radius, spacing } from '../tokens';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
};

export function BottomSheet({ visible, onClose, children, title }: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.wrapper}>
        <Pressable
          accessibilityLabel="Закрыть"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.scrim}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grab} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grab: {
    alignSelf: 'center',
    backgroundColor: '#2E3A33',
    borderRadius: 4,
    height: 4,
    marginBottom: 18,
    width: 36,
  },
  scrim: {
    backgroundColor: colors.overlay,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.titleSmall,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
