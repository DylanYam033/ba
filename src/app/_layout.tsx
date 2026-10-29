import {
  Epilogue_700Bold,
  Epilogue_800ExtraBold,
  Epilogue_900Black,
} from '@expo-google-fonts/epilogue';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/ctx/auth';
import { NotificationsProvider } from '@/ctx/notifications';
import { SocketProvider } from '@/ctx/socket';
import { AppThemeProvider, useAppTheme } from '@/ctx/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Epilogue_700Bold,
    Epilogue_800ExtraBold,
    Epilogue_900Black,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  return (
    <AppThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationsProvider>
            <RootNavigator ready={fontsLoaded} />
          </NotificationsProvider>
        </SocketProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

function RootNavigator({ ready }: { ready: boolean }) {
  const { user, isLoading } = useAuth();
  const { scheme, colors } = useAppTheme();

  useEffect(() => {
    if (ready && !isLoading) SplashScreen.hide();
  }, [ready, isLoading]);

  if (!ready || isLoading) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.surface, primary: colors.primary, text: colors.text },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="event/[id]" />
          <Stack.Screen name="create-event" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="user/[id]" />
          <Stack.Screen name="follows" />
          <Stack.Screen name="photo-viewer" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
