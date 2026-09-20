import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/design-system';
import { colors, fontFamilies, hairline, radius, spacing, touchTarget } from '@/design-system/tokens';

const ways: { route: '/task-picker' | '/task-generate' | '/task-new' | '/task-photo'; icon: AppIconName; title: string; hint: string; short: string }[] = [
  { route: '/task-picker', icon: 'library', title: 'Из банка', hint: 'Готовые задания', short: 'Банк' },
  { route: '/task-generate', icon: 'insight', title: 'Генератор', hint: 'Сервер составит', short: 'Генератор' },
  { route: '/task-new', icon: 'edit', title: 'Своё', hint: 'Вопрос и ответ', short: 'Своё' },
  { route: '/task-photo', icon: 'camera', title: 'Из фото', hint: 'Страница учебника', short: 'Фото' },
];

/** The three ways to add tasks: big tiles when the test is empty, a slim row of chips once it has tasks. */
export function AddTasks({ compact }: { compact: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {ways.map((w) => (
        <Pressable
          accessibilityLabel={`${w.title}. ${w.hint}`}
          accessibilityRole="button"
          android_ripple={{ color: 'rgba(244, 248, 245, 0.1)' }}
          key={w.route}
          onPress={() => router.push(w.route)}
          style={[compact ? styles.chip : styles.tile]}
        >
          <AppIcon color={colors.primary} name={compact ? 'add' : w.icon} size={compact ? 18 : 28} />
          <Text numberOfLines={1} style={compact ? styles.chipText : styles.tileTitle}>{compact ? w.short : w.title}</Text>
          {compact ? null : <Text numberOfLines={1} style={styles.tileHint}>{w.hint}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, flexBasis: '22%', flexGrow: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: touchTarget - 4, paddingHorizontal: spacing.xs },
  chipText: { color: colors.successSoft, fontFamily: fontFamilies.semibold, fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tile: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.divider, borderRadius: radius.lg, borderWidth: hairline, flexBasis: '47%', flexGrow: 1, gap: 4, justifyContent: 'center', minHeight: 96, paddingHorizontal: 4, paddingVertical: spacing.sm },
  tileHint: { color: colors.textFaint, fontFamily: fontFamilies.regular, fontSize: 11 },
  tileTitle: { color: colors.text, fontFamily: fontFamilies.semibold, fontSize: 14 },
});
