import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Icon, type IconName } from '@/components/icon';
import { AppText, GradientButton, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';

type AccountType = 'user' | 'business';

const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string; icon: IconName }[] = [
  { value: 'user', label: 'Personal', hint: 'Descubre y asiste', icon: 'person' },
  { value: 'business', label: 'Negocio', hint: 'Publica tus eventos', icon: 'store' },
];

export default function SignUp() {
  const { colors } = useAppTheme();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [accountType, setAccountType] = useState<AccountType>('user');
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form | 'form', string>>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Mirrors RegisterDto validation in eventspot-api.
  const validate = () => {
    const next: typeof errors = {};
    if (!/^[a-zA-Z0-9_.]{3,50}$/.test(form.username)) next.username = 'De 3 a 50 caracteres: letras, números, _ o .';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Ingresa un correo válido.';
    if (form.password.length < 8) next.password = 'Mínimo 8 caracteres.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp({ ...form, accountType });
    } catch (e) {
      if (__DEV__) console.warn('[sign-up]', e);
      setErrors({ form: (e as Error).message === 'Email or username already in use' ? 'Ese correo o usuario ya está en uso.' : (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Únete a los eventos" subtitle="Crea tu cuenta en segundos.">
      <View style={{ gap: Spacing.four - 4 }}>
        <View style={styles.types}>
          {ACCOUNT_TYPES.map((t) => {
            const active = accountType === t.value;
            return (
              <Pressable
                key={t.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setAccountType(t.value)}
                style={[
                  styles.type,
                  { backgroundColor: active ? colors.primaryContainer : colors.surfaceHighest },
                ]}>
                <Icon name={t.icon} color={active ? colors.onPrimaryContainer : colors.secondary} />
                <AppText variant="bodyStrong" color={active ? colors.onPrimaryContainer : colors.text}>
                  {t.label}
                </AppText>
                <AppText variant="caption" color={active ? colors.onPrimaryContainer : colors.textSecondary}>
                  {t.hint}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label="Usuario"
          placeholder="tu_usuario"
          autoCapitalize="none"
          value={form.username}
          onChangeText={set('username')}
          error={errors.username}
        />
        <TextField
          label="Correo electrónico"
          placeholder="nombre@correo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={form.email}
          onChangeText={set('email')}
          error={errors.email}
        />
        <TextField
          label="Contraseña"
          placeholder="Mínimo 8 caracteres"
          secureTextEntry
          autoComplete="new-password"
          value={form.password}
          onChangeText={set('password')}
          onSubmitEditing={submit}
          error={errors.password}
        />
        {errors.form && (
          <AppText variant="caption" color={colors.error}>
            {errors.form}
          </AppText>
        )}
        <GradientButton title="Crear cuenta" loading={loading} onPress={submit} style={{ marginTop: Spacing.two }} />
      </View>
      <Pressable onPress={() => router.replace('/sign-in')} style={{ alignSelf: 'center' }}>
        <AppText variant="body" color={colors.textSecondary}>
          ¿Ya tienes cuenta? <AppText variant="bodyStrong" color={colors.primary}>Inicia sesión</AppText>
        </AppText>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  types: { flexDirection: 'row', gap: Spacing.three - 4 },
  type: { flex: 1, borderRadius: Radius.md - 8, padding: Spacing.three, gap: 4 },
});
