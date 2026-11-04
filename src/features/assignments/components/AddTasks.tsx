import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName, Card, textStyles } from '@/design-system';
import { colors, fontFamilies, radius, spacing, touchTarget } from '@/design-system/tokens';

const ways: { route: '/task-picker' | '/task-generate' | '/task-new' | '/task-photo'; icon: AppIconName; title: string; hint: string; short: string }[] = [
  { route: '/task-picker', icon: 'library', title: 'Из банка', hint: 'Готовые задания', short: 'Банк' },
  { route: '/task-generate', icon: 'insight', title: 'Генератор', hint: 'Сервер составит', short: 'Генератор' },
  { route: '/task-new', icon: 'edit', title: 'Своё', hint: 'Вопрос и ответ', short: 'Своё' },
  { route: '/task-photo', icon: 'camera', title: 'Из фото', hint: 'Страница учебника', short: 'Фото' },
];

/** The ways to add tasks: 2-per-row Card tiles with a 44x44 primarySoft icon square and caption. */
export function AddTasks({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.grid}>
      {ways.map((w) => (
        <Pressable
          accessibilityLabel={`${w.title}. ${w.hint}`}
          accessibilityRole="button"
          android_ripple={{ color: 'rgba(244, 248, 245, 0.1)' }}
          key={w.route}
          onPress={() => router.push(w.route)}
          style={styles.cell}
        >
          <Card style={styles.tile}>
            <View style={styles.iconBox}>
              <AppIcon color={colors.primary} name={w.icon} size={22} />
            </View>
            <View style={styles.copy}>
              <Text numberOfLines={1} style={styles.tileTitle}>
                {compact ? w.short : w.title}
              </Text>
              <Text numberOfLines={1} style={textStyles.caption}>
                {w.hint}
              </Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: touchTarget,
  },
  copy: {
    gap: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  tile: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  tileTitle: {
    ...textStyles.bodySmall,
    color: colors.text,
    fontFamily: fontFamilies.semibold,
  },
});
