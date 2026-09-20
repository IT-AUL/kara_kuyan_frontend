import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { studentsText } from '@/domain/format/plural';
import { AppIcon, type AppIconName } from '@/design-system';
import { colors, fontFamilies, hairline, radius, spacing } from '@/design-system/tokens';

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
        <Pressable
          accessibilityLabel={`${it.title}. ${it.hint}`}
          accessibilityRole="button"
          android_ripple={{ color: 'rgba(244, 248, 245, 0.1)' }}
          key={it.route}
          onPress={() => router.push(it.route)}
          style={styles.tile}
        >
          <AppIcon color={colors.primary} name={it.icon} size={26} />
          <Text numberOfLines={1} style={styles.title}>{it.title}</Text>
          <Text numberOfLines={1} style={styles.hint}>{it.hint}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textFaint, fontFamily: fontFamilies.regular, fontSize: 11 },
  row: { flexDirection: 'row', gap: spacing.xs },
  tile: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.divider, borderRadius: radius.lg, borderWidth: hairline, flex: 1, gap: 4, justifyContent: 'center', minHeight: 96, paddingHorizontal: 4, paddingVertical: spacing.sm },
  title: { color: colors.text, fontFamily: fontFamilies.semibold, fontSize: 14 },
});
