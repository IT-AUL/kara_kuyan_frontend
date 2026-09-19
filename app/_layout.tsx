import {
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
  useFonts,
} from '@expo-google-fonts/onest';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { syncScheduler } from '@/composition';
import { colors } from '@/design-system';
import { useSession } from '@/data/session';
import { UpdatePrompt } from '@/features/update/UpdatePrompt';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { profile } = useSession();
  const [fontsLoaded, fontError] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
  });

  useEffect(() => {
    void syncScheduler.start();
    return () => syncScheduler.stop();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.background },
            headerShown: false,
          }}
        >
          <Stack.Protected guard={profile === null}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={profile !== null}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="check" />
            <Stack.Screen name="scan" />
            <Stack.Screen name="processing" />
            <Stack.Screen name="student-identified" />
            <Stack.Screen name="assessment-result" />
            <Stack.Screen name="task-review" />
            <Stack.Screen name="analytics" />
            <Stack.Screen name="export-gradebook" />
            <Stack.Screen name="class-form" />
            <Stack.Screen name="test-form" />
            <Stack.Screen name="test-detail" />
            <Stack.Screen name="task-picker" />
            <Stack.Screen name="task-generate" />
            <Stack.Screen name="task-new" />
          </Stack.Protected>
          <Stack.Screen name="ocr-lab" />
        </Stack>
        <UpdatePrompt />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
