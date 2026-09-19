import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Field, Notice, Screen, ScreenHeader, textStyles } from '@/design-system';
import { spacing } from '@/design-system/tokens';
import { session } from '@/data/session';

/** First run: registers this phone with the backend (device handshake). */
export function OnboardingScreen() {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = name.trim().length >= 2 && school.trim().length >= 2 && !busy;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await session.signIn(name, school);
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <Screen
      footer={<Button disabled={!canSubmit} icon="check" onPress={() => void submit()} title={busy ? 'Подключаемся…' : 'Продолжить'} />}
    >
      <ScreenHeader eyebrow="Кара Куян" subtitle="Один раз: так сервер узнает ваш телефон." title="Знакомство" />
      <Field autoCapitalize="words" label="Ваше имя" onChangeText={setName} placeholder="Каримова Гөлнара Илдар кызы" value={name} />
      <Field autoCapitalize="words" label="Школа" onChangeText={setSchool} placeholder="Гимназия №2" value={school} />
      <Text style={[textStyles.caption, styles.hint]}>Фотографии листов не сохраняются и не отправляются: на сервер уходят только результаты проверки.</Text>
      {error ? <Notice message={error} tone="error" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ hint: { marginTop: spacing.xs } });
