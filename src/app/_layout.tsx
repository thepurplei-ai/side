import { Fraunces_700Bold, Fraunces_700Bold_Italic } from '@expo-google-fonts/fraunces';
import { Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppStoreProvider, useStore } from '@/store/AppStore';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, text: colors.text, border: colors.border },
};

function RootStack() {
  const { state } = useStore();
  const [fontsLoaded, fontError] = useFonts({ Fraunces_700Bold, Fraunces_700Bold_Italic, Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold });
  const ready = state.loaded && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;
  const signedIn = !!state.me && state.adultConfirmed;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 19 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
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
