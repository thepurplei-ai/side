import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppStoreProvider, useStore } from '@/store/AppStore';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, text: colors.text, border: colors.border },
};

function RootStack() {
  const { state } = useStore();

  useEffect(() => {
    if (state.loaded) SplashScreen.hideAsync().catch(() => {});
  }, [state.loaded]);

  if (!state.loaded) return null;
  const signedIn = !!state.me && state.adultConfirmed;

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="comments/[id]" options={{ presentation: 'modal', title: 'Comments' }} />
        <Stack.Screen name="project/[id]" options={{ title: 'Project' }} />
        <Stack.Screen name="video/[id]" options={{ headerTransparent: true, title: '' }} />
        <Stack.Screen name="user/[id]" options={{ title: '' }} />
        <Stack.Screen name="family" options={{ title: 'Family Mode' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal', title: 'Edit profile' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ThemeProvider value={theme}>
        <AppStoreProvider>
          <StatusBar style="light" />
          <RootStack />
        </AppStoreProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
