import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  AppIcon,
  colors,
  fontFamilies,
  fontSizes,
  radius,
  spacing,
  textStyles,
} from '@/design-system';

export type ZeroTouchBannerProps = {
  /** True when the sheet had zero uncertain cells right out of OCR (42% Zero-Touch flow). */
  pristine: boolean;
  /** Disabled when no student is selected yet. */
  canSave: boolean;
  onSwipeSave: () => void;
};

export function ZeroTouchBanner({ pristine, canSave, onSwipeSave }: ZeroTouchBannerProps) {
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(canSave)
    .activeOffsetX([-18, 18])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      'worklet';
      translateX.value = Math.max(0, Math.min(180, e.translationX));
    })
    .onEnd((e) => {
      'worklet';
      if (canSave && e.translationX > 80) {
        translateX.value = withSpring(260);
        runOnJS(onSwipeSave)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const title = pristine ? 'Всё чисто, 100% распознано' : 'Все спорные ячейки проверены';
  const subtitle = canSave
    ? 'Смахните карточку вправо — сохранит и откроет камеру за 1 сек'
    : 'Выберите ученика выше, чтобы сохранить лист';

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessibilityLabel={`${title}. ${subtitle}`}
        style={[styles.banner, animatedStyle]}
      >
        <View style={styles.iconWrap}>
          <AppIcon color={colors.primary} name="checkCircle" size={24} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {canSave ? (
          <Pressable
            accessibilityLabel="Сохранить и сканировать следующий лист"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onSwipeSave}
            style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}
          >
            <AppIcon color={colors.toastText} name="arrowRight" size={18} />
          </Pressable>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryDeep,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(37, 227, 138, 0.14)',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  pressed: {
    opacity: 0.85,
  },
  quickButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  subtitle: {
    ...textStyles.caption,
    color: colors.successSoft,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.body,
  },
});
