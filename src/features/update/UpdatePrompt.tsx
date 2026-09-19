import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ProgressBar, colors, radius, spacing, textStyles } from '@/design-system';
import { useAppUpdate } from './useAppUpdate';

const mb = (bytes: number) => `${Math.round(bytes / 1048576)} МБ`;

/** Dismissible «доступна новая версия» card, mounted once in the root layout. Renders nothing when there is no update. */
export function UpdatePrompt() {
  const { state, start, dismiss } = useAppUpdate();
  const insets = useSafeAreaInsets();
  if (state.kind === 'none') return null;

  const { offer } = state;
  const busy = state.kind === 'downloading';
  const line =
    state.kind === 'needs-permission'
      ? 'Разрешите установку из этого приложения в настройках, вернитесь и нажмите «Обновить» ещё раз.'
      : state.kind === 'error'
        ? state.message
        : busy
          ? `Загрузка… ${Math.round(state.fraction * 100)}%`
          : `Размер ${mb(offer.apk.size)}. Ваши данные сохранятся.`;

  return (
    <View accessibilityLiveRegion="polite" style={[styles.card, { bottom: insets.bottom + spacing.md }]}>
      <Text style={textStyles.body}>Доступна версия {offer.version}</Text>
      <Text style={textStyles.bodySmall}>{line}</Text>
      {busy ? <ProgressBar percent={Math.round(state.fraction * 100)} /> : null}
      <View style={styles.actions}>
        <Button compact disabled={busy} onPress={() => void start(offer)} title={state.kind === 'error' ? 'Повторить' : 'Обновить'} />
        <Button compact disabled={busy} onPress={dismiss} title="Позже" variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    left: spacing.md,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.md,
  },
});
