import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontFamilies, spacing } from '../tokens';

type ToastProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  visible: boolean;
};

export function Toast({ message, actionLabel, onAction, visible }: ToastProps) {
  const [translateY] = useState(() => new Animated.Value(40));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      translateY.setValue(40);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          duration: 250,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 250,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [opacity, translateY, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.message}>{message}</Text>
      {actionLabel ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          hitSlop={12}
          onPress={onAction}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actionText: {
    color: colors.primaryDeep,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.toast,
    borderRadius: 18,
    bottom: 110,
    flexDirection: 'row',
    gap: spacing.sm,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'absolute',
    right: 16,
  },
  message: {
    color: colors.toastText,
    flex: 1,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
});
