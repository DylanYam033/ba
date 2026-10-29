import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/event-cards';
import { Icon } from '@/components/icon';
import { TopBar, BackButton } from '@/components/top-bar';
import { AppText, Chip, GhostButton, glow, GradientButton, TextField } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth, useCurrentUser } from '@/ctx/auth';
import { RADIUS_OPTIONS, usePreferences } from '@/ctx/preferences';
import { useAppTheme } from '@/ctx/theme';
import { ApiError } from '@/lib/api';
import { usersApi } from '@/lib/endpoints';
import { pickImage } from '@/lib/pick-image';

export default function EditProfile() {
  const { colors, scheme, toggle } = useAppTheme();
  const { setUser } = useAuth();
  const { radiusKm, setRadiusKm } = usePreferences();
  const user = useCurrentUser();
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // The avatar is saved as soon as it's picked, independently of the form.
  const changeAvatar = async () => {
    setError(null);
    const file = await pickImage({ square: true, quality: 0.7 });
    if (!file) return;
    setUploading(true);
    try {
      setUser(await usersApi.uploadAvatar(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!/^[a-zA-Z0-9_.]{3,50}$/.test(username)) {
      setError('El usuario debe tener 3 a 50 caracteres (letras, números, _ o .).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await usersApi.update(user.id, {
        username: username !== user.username ? username : undefined,
        bio,
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
          <Pressable
            onPress={changeAvatar}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Cambiar foto de perfil"
            style={[styles.avatar, glow(colors.primary, 0.3, 30)]}>
            <Avatar uri={user.avatarUrl} name={username || user.username} size={120} />
            {uploading && (
              <View style={[styles.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Icon name="camera" size={16} color={colors.onPrimary} />
            </View>
          </Pressable>
          <AppText variant="caption" style={{ textAlign: 'center', marginTop: -Spacing.three }}>
            Toca la foto para cambiarla
          </AppText>
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
          <AppText variant="caption">El correo ({user.email}) no se puede cambiar desde la app.</AppText>

          {/* Device preference: applies right away, independent of "Guardar cambios". */}
          <View style={[styles.prefs, { backgroundColor: colors.surfaceContainer }]}>
            <View style={{ gap: 2 }}>
              <AppText variant="label">Distancia de búsqueda</AppText>
              <AppText variant="caption">
                Mostrar eventos a menos de {radiusKm} km de ti en el mapa y en Explorar.
              </AppText>
            </View>
            <View style={styles.radiusRow}>
              {RADIUS_OPTIONS.map((km) => (
                <Chip key={km} label={`${km} km`} active={radiusKm === km} onPress={() => setRadiusKm(km)} />
              ))}
            </View>
          </View>
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
  prefs: { padding: Spacing.three, borderRadius: Radius.md, gap: Spacing.three },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  avatarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
