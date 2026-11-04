import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName, colors, fontFamilies, fontSizes, hairline, radius } from '@/design-system';

function TabIcon({ focused, name }: { focused: boolean; name: AppIconName }) {
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <AppIcon color={focused ? colors.primary : colors.textFaint} name={name} size={24} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: {
          fontFamily: fontFamilies.medium,
          fontSize: fontSizes.caption,
          lineHeight: 16,
        },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.divider,
          borderTopWidth: hairline,
          height: 76 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="home" />,
          title: 'Главная',
        }}
      />
      <Tabs.Screen
        name="checking"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="scan" />,
          title: 'Проверка',
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="analytics" />,
          title: 'Аналитика',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="more" />,
          title: 'Ещё',
        }}
      />
      <Tabs.Screen name="assignments" options={{ href: null }} />
      <Tabs.Screen name="classes" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 32,
    justifyContent: 'center',
    width: 64,
  },
  pillActive: {
    backgroundColor: colors.primarySoft,
  },
});
