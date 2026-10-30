import { router } from 'expo-router';
import { useFormik } from 'formik';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Icon, type IconName } from '@/components/icon';
import { AppText, GradientButton, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { signUpSchema, type AccountType, type SignUpValues } from '@/lib/user-form';

const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string; icon: IconName }[] = [
  { value: 'user', label: 'Personal', hint: 'Descubre y asiste', icon: 'person' },
  { value: 'business', label: 'Negocio', hint: 'Publica tus eventos', icon: 'store' },
];

export default function SignUp() {
  const { colors } = useAppTheme();
  const { signUp } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useFormik<SignUpValues>({
    initialValues: { username: '', email: '', password: '', accountType: 'user' },
    validationSchema: signUpSchema,
    onSubmit: async (v) => {
      setSubmitError(null);
      try {
        await signUp({ ...v, username: v.username.trim(), email: v.email.trim() });
      } catch (e) {
        if (__DEV__) console.warn('[sign-up]', e);
        const message = (e as Error).message;
        setSubmitError(message === 'Email or username already in use' ? 'Ese correo o usuario ya está en uso.' : message);
      }
    },
  });
  /** Text field bindings; errors show once the field was left or the form submitted. */
  const field = (name: 'username' | 'email' | 'password') => ({
    value: form.values[name],
    onChangeText: form.handleChange(name),
    onBlur: form.handleBlur(name),
    error: form.touched[name] ? form.errors[name] : undefined,
  });
  const submit = () => form.handleSubmit();
  const accountType = form.values.accountType;

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
                onPress={() => form.setFieldValue('accountType', t.value)}
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
        <TextField label="Usuario" placeholder="tu_usuario" autoCapitalize="none" {...field('username')} />
        <TextField
          label="Correo electrónico"
          placeholder="nombre@correo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          {...field('email')}
        />
        <TextField
          label="Contraseña"
          placeholder="Mínimo 8 caracteres"
          secureTextEntry
          autoComplete="new-password"
          maxLength={100}
          onSubmitEditing={submit}
          {...field('password')}
        />
        {submitError && (
          <AppText variant="caption" color={colors.error}>
            {submitError}
          </AppText>
        )}
        <GradientButton title="Crear cuenta" loading={form.isSubmitting} onPress={submit} style={{ marginTop: Spacing.two }} />
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
