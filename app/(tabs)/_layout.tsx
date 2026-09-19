import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, colors, fontFamilies, hairline } from '@/design-system';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fontFamilies.medium,
          fontSize: 11,
          lineHeight: 14,
        },
        tabBarStyle: {
          backgroundColor: colors.surfaceSoft,
          borderTopColor: colors.divider,
          borderTopWidth: hairline,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => <AppIcon color={color} name="home" size={size} />,
          title: 'Главная',
        }}
      />
      <Tabs.Screen
        name="checking"
        options={{
          tabBarIcon: ({ color, size }) => <AppIcon color={color} name="scan" size={size} />,
          title: 'Проверка',
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          tabBarIcon: ({ color, size }) => <AppIcon color={color} name="assignment" size={size} />,
          title: 'Задания',
        }}
      />
      <Tabs.Screen name="classes" options={{ href: null }} />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ color, size }) => <AppIcon color={color} name="more" size={size} />,
          title: 'Ещё',
        }}
      />
    </Tabs>
  );
}
