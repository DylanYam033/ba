import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/event-cards';
import { TopBar, BackButton } from '@/components/top-bar';
import { AppText, GhostButton, glow, GradientButton, TextField } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth, useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { ApiError } from '@/lib/api';
import { usersApi } from '@/lib/endpoints';

export default function EditProfile() {
  const { colors, scheme, toggle } = useAppTheme();
  const { setUser } = useAuth();
  const user = useCurrentUser();
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!/^[a-zA-Z0-9_.]{3,50}$/.test(username)) {
      setError('El usuario debe tener 3 a 50 caracteres (letras, números, _ o .).');
      return;
    }
    if (avatarUrl && !/^https?:\/\/\S+$/.test(avatarUrl)) {
      setError('La foto debe ser una URL que empiece por http(s)://');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await usersApi.update(user.id, {
        username: username !== user.username ? username : undefined,
        bio,
        avatarUrl: avatarUrl || undefined,
      });
      setUser(updated);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? 'Ese nombre de usuario ya está en uso.' : (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar
        title="Editar perfil"
        left={<BackButton />}
        right={
          <Pressable onPress={toggle} accessibilityLabel="Cambiar tema">
            <AppText variant="bodyStrong" color={colors.primary}>
              {scheme === 'dark' ? 'Claro' : 'Oscuro'}
            </AppText>
          </Pressable>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.avatar, glow(colors.primary, 0.3, 30)]}>
            <Avatar uri={avatarUrl || null} name={username || user.username} size={120} />
          </View>
          <TextField label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TextField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
            placeholder="Fan del techno, cazador de terrazas…"
            style={{ minHeight: 110, textAlignVertical: 'top' }}
          />
          <TextField
            label="URL de foto de perfil"
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://…"
          />
          <AppText variant="caption">El correo ({user.email}) no se puede cambiar desde la app.</AppText>
          {error && (
            <AppText variant="caption" color={colors.error}>
              {error}
            </AppText>
          )}
          <View style={{ gap: Spacing.three, marginTop: Spacing.three }}>
            <GradientButton title="Guardar cambios" loading={saving} onPress={save} />
            <GhostButton title="Cancelar" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  avatar: { alignSelf: 'center', borderRadius: 60, marginVertical: Spacing.three },
});
