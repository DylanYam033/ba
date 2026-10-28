import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Icon } from '@/components/icon';
import { AppText, GradientButton, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { ApiError } from '@/lib/api';

export default function SignIn() {
  const { colors } = useAppTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || password.length < 8) {
      setError('Ingresa tu correo y una contraseña de al menos 8 caracteres.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      // Stack.Protected swaps to the app once the session is set.
    } catch (e) {
      if (__DEV__) console.warn('[sign-in]', e);
      setError(e instanceof ApiError && e.status === 401 ? 'Correo o contraseña incorrectos.' : (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Bienvenido de nuevo" subtitle="Inicia sesión para encontrar tu próximo plan.">
      <View style={{ gap: Spacing.four - 4 }}>
        <TextField
          label="Correo electrónico"
          placeholder="nombre@correo.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label="Contraseña"
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          right={
            <Pressable onPress={() => setShowPassword((s) => !s)} style={{ paddingRight: 16 }} accessibilityLabel="Mostrar contraseña">
              <Icon name={showPassword ? 'eyeOff' : 'eye'} color={colors.textSecondary} />
            </Pressable>
          }
        />
        {error && (
          <AppText variant="caption" color={colors.error}>
            {error}
          </AppText>
        )}
        <GradientButton title="Iniciar sesión" loading={loading} onPress={submit} style={{ marginTop: Spacing.two }} />
      </View>
      <Pressable onPress={() => router.replace('/sign-up')} style={{ alignSelf: 'center' }}>
        <AppText variant="body" color={colors.textSecondary}>
          ¿Nuevo en EventSpot? <AppText variant="bodyStrong" color={colors.primary}>Regístrate</AppText>
        </AppText>
      </Pressable>
    </AuthShell>
  );
}
