import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { studentsText } from '@/domain/format/plural';
import { AppIcon, type AppIconName, Card } from '@/design-system';
import { withAlpha } from '@/design-system/color';
import { colors, fontFamilies, radius, spacing } from '@/design-system/tokens';

type ShortcutsProps = { studentCount: number };

/** One-tap access to what otherwise sits two levels deep under «Ещё»: the class, its analytics, the gradebook. */
export function Shortcuts({ studentCount }: ShortcutsProps) {
  const router = useRouter();
  const items: { route: '/classes' | '/analytics' | '/export-gradebook'; icon: AppIconName; title: string; hint: string }[] = [
    { route: '/classes', icon: 'classes', title: 'Класс', hint: studentCount > 0 ? studentsText(studentCount) : 'Добавить' },
    { route: '/analytics', icon: 'analytics', title: 'Аналитика', hint: 'Темы и оценки' },
    { route: '/export-gradebook', icon: 'export', title: 'Журнал', hint: 'XLSX / CSV' },
  ];
  return (
    <View style={styles.row}>
      {items.map((it) => (
        <Card key={it.route} style={styles.card}>
          <Pressable
            accessibilityLabel={`${it.title}. ${it.hint}`}
            accessibilityRole="button"
            android_ripple={{ color: withAlpha(colors.text, 0.1) }}
            onPress={() => router.push(it.route)}
            style={styles.tile}
          >
            <AppIcon color={colors.primary} name={it.icon} size={22} />
            <Text numberOfLines={1} style={styles.title}>{it.title}</Text>
            <Text numberOfLines={1} style={styles.hint}>{it.hint}</Text>
          </Pressable>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    flex: 1,
    height: 88,
    overflow: 'hidden',
    padding: 0,
  },
  hint: { color: colors.textFaint, fontFamily: fontFamilies.regular, fontSize: 11 },
  row: { flexDirection: 'row', gap: spacing.xs },
  tile: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    height: 88,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xs,
  },
  title: { color: colors.text, fontFamily: fontFamilies.semibold, fontSize: 14 },
});
