import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { session } from '@/data/session';
import {
  AppIcon,
  Button,
  colors,
  fontFamilies,
  Notice,
  radius,
  Screen,
  spacing,
  textStyles,
} from '@/design-system';

import { PrivacyPrimer } from './components/PrivacyPrimer';
import { PromiseCard } from './components/PromiseCard';

/** First run: registers this phone with the backend (device handshake). */
export function OnboardingScreen() {
  const [name, setName] = useState('');
  const [step, setStep] = useState<'name' | 'privacy'>('name');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = name.trim().length >= 2 && !busy;

  const start = () => {
    if (!canSubmit) return;
    setError(null);
    setStep('privacy');
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await session.signIn(name, '');
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      setStep('name');
    }
  };

  if (step === 'privacy') {
    return <PrivacyPrimer onBack={() => setStep('name')} onContinue={() => void submit()} />;
  }

  return (
    <Screen
      avoidKeyboard
      footer={
        <View style={styles.footer}>
          {error ? <Notice message={error} tone="error" /> : null}
          <View style={styles.nameField}>
            <View style={styles.personBox}>
              <AppIcon color={colors.primary} name="person" size={20} />
            </View>
            <View style={styles.inputWrap}>
              <Text style={[textStyles.caption, styles.inputLabel]}>Как к вам обращаться</Text>
              <TextInput
                accessibilityLabel="Как к вам обращаться"
                autoCapitalize="words"
                onChangeText={setName}
                placeholder="Каримова Гөлнара Илдар кызы"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                value={name}
              />
            </View>
            <AppIcon color={colors.textFaint} name="edit" size={18} />
          </View>
          <Button
            disabled={!canSubmit}
            onPress={start}
            title={busy ? 'Подключаемся…' : 'Начать'}
            variant="primary"
          />
        </View>
      }
    >
      <View style={styles.logoBox}>
        <AppIcon color={colors.background} name="school" size={28} />
      </View>
      <Text style={styles.heading}>
        {'Стопка работ\nза '}
        <Text style={styles.headingAccent}>10 минут</Text>
      </Text>
      <Text style={[textStyles.body, styles.subtitle]}>
        Проверяйте рукописные работы по татарскому языку камерой телефона.
      </Text>
      <View style={styles.promises}>
        <PromiseCard
          caption="Наведите камеру — оценка через секунду"
          icon="scan"
          title="Балл появляется сам"
        />
        <PromiseCard
          caption="Только сомнительные буквы"
          icon="check"
          title="Спорное решаете вы"
        />
        <PromiseCard
          caption="И кому именно"
          icon="analytics"
          title="Видно, что повторить"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.sm,
  },
  heading: {
    color: colors.text,
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    lineHeight: 40,
  },
  headingAccent: {
    color: colors.primary,
  },
  input: {
    color: colors.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 17,
    paddingVertical: 0,
  },
  inputLabel: {
    color: colors.primary,
  },
  inputWrap: {
    flex: 1,
    gap: 2,
  },
  logoBox: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 56,
    justifyContent: 'center',
    marginTop: spacing.xxl,
    width: 56,
  },
  nameField: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  personBox: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  promises: {
    gap: 10,
  },
  subtitle: {
    color: colors.textMuted,
  },
});
