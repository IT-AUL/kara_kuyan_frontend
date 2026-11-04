import { StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  Button,
  colors,
  fontFamilies,
  radius,
  spacing,
  textStyles,
} from '@/design-system';

type PrivacyPrimerProps = {
  onContinue: () => void;
  onBack: () => void;
};

export function PrivacyPrimer({ onContinue, onBack }: PrivacyPrimerProps) {
  return (
    <View style={styles.root}>
      <View style={styles.iconBox}>
        <AppIcon color={colors.text} name="checkCircle" size={30} />
      </View>
      <Text style={styles.title}>Фото работ не сохраняются</Text>
      <Text style={[textStyles.body, styles.body]}>
        Кадр распознаётся в памяти телефона и сразу стирается. На сервер уходят только оценки.
      </Text>
      <View style={styles.actions}>
        <Button onPress={onContinue} title="Продолжить" variant="primary" />
        <Button onPress={onBack} title="Назад" variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },
  body: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  root: {
    alignItems: 'center',
    backgroundColor: colors.scanBackdrop,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    lineHeight: 32,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
