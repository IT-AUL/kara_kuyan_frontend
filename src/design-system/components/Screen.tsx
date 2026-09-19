import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, hairline, spacing } from '../tokens';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  footer?: ReactNode;
}>;

export function Screen({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  contentStyle,
  footer,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <View style={styles.frame}>
        {content}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
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
