import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, hairline, spacing } from '../tokens';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  footer?: ReactNode;
  /** Pull-to-refresh: shown when `onRefresh` is set. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Lifts the footer above the on-screen keyboard: for screens with text fields. */
  avoidKeyboard?: boolean;
}>;

export function Screen({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  contentStyle,
  footer,
  onRefresh,
  refreshing = false,
  avoidKeyboard = false,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl colors={[colors.primary]} onRefresh={onRefresh} progressBackgroundColor={colors.surfaceRaised} refreshing={refreshing} tintColor={colors.primary} />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView behavior="padding" style={styles.frame}>
          {content}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.frame}>
          {content}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fill: {
    flex: 1,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.divider,
    borderTopWidth: hairline,
    gap: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  frame: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
