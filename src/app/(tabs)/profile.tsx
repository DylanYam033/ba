import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, RowEventCard } from '@/components/event-cards';
import { Icon, type IconName } from '@/components/icon';
import { TopBar } from '@/components/top-bar';
import { AppText, EmptyState, GhostButton, glow, GradientButton, IconButton, SectionHeader } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { useAuth, useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { useQuery } from '@/hooks/use-query';
import { compactNumber } from '@/lib/format';
import { usersApi } from '@/lib/endpoints';

export default function Profile() {
  const { colors, scheme, toggle } = useAppTheme();
  const { signOut } = useAuth();
  const user = useCurrentUser();
  const isBusiness = user.accountType === 'business';

  const data = useQuery(async () => {
    const [stats, saved] = await Promise.all([usersApi.stats(user.id), usersApi.myEvents('saved')]);
    return { stats, saved };
  }, [user.id]);

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      signOut();
      return;
    }
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  const stats = data.data?.stats;
  const saved = data.data?.saved ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar right={<View />} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} tintColor={colors.secondary} />}>
        <View style={styles.actions}>
          <IconButton icon={scheme === 'dark' ? 'lightMode' : 'darkMode'} label="Cambiar tema" onPress={toggle} color={colors.secondary} />
          <IconButton icon="settings" label="Editar perfil" onPress={() => router.push('/edit-profile')} />
        </View>

        <View style={styles.hero}>
          <View style={glow(colors.primary, 0.35, 40)}>
            <LinearGradient colors={[colors.primary, colors.secondary, colors.primary]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.ring}>
              <View style={[styles.ringInner, { borderColor: colors.background }]}>
                <Avatar uri={user.avatarUrl} name={user.username} size={112} />
              </View>
            </LinearGradient>
          </View>
          <View style={{ alignItems: 'center', gap: Spacing.two }}>
            <View style={styles.nameRow}>
              <AppText variant="title">@{user.username}</AppText>
              {user.isVerified && <Icon name="check" size={20} color={colors.secondary} />}
            </View>
            {isBusiness && (
              <AppText variant="label" color={colors.tertiary}>
                Cuenta de negocio
              </AppText>
            )}
            <AppText variant="body" color={colors.textSecondary} style={{ textAlign: 'center', maxWidth: 300 }}>
              {user.bio || 'Aún no tienes bio. Cuéntale a la ciudad qué te mueve.'}
            </AppText>
          </View>
          <View style={styles.follow}>
            <Counter value={stats?.followers} label="Seguidores" color={colors.primary} />
            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
            <Counter value={stats?.following} label="Siguiendo" color={colors.secondary} />
          </View>
        </View>

        {isBusiness && <GradientButton title="Crear evento" icon="add" onPress={() => router.push('/create-event')} />}

        <View style={styles.statGrid}>
          <StatCard label="Eventos asistidos" value={stats?.eventsAttended} icon="ticket" color={colors.primary} />
          <StatCard label="Fotos compartidas" value={stats?.photosShared} icon="photos" color={colors.secondary} />
        </View>

        <View style={{ gap: Spacing.three }}>
          <SectionHeader title="Mis eventos guardados" action={saved.length > 2 ? 'Ver todo' : undefined} onAction={() => router.navigate('/events')} />
          {saved.length === 0 && !data.loading ? (
            <EmptyState icon="bookmark" title="Nada guardado" message="Toca el marcador en un evento para guardarlo." />
          ) : (
            saved.slice(0, 2).map((e) => <RowEventCard key={e.id} event={e} />)
          )}
        </View>

        <GhostButton title="Cerrar sesión" icon="logout" onPress={confirmSignOut} />
      </ScrollView>
    </View>
  );
}

function Counter({ value, label, color }: { value?: number; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <AppText variant="heading" color={color}>
        {value === undefined ? '–' : compactNumber(value)}
      </AppText>
      <AppText variant="label" style={{ fontSize: 10 }}>
        {label}
      </AppText>
    </View>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value?: number; icon: IconName; color: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surfaceContainer }]}>
      <View style={styles.statIcon}>
        <Icon name={icon} size={72} color={colors.surfaceHighest} />
      </View>
      <AppText variant="label" style={{ fontSize: 10 }}>
        {label}
      </AppText>
      <AppText variant="display" color={color}>
        {value ?? '–'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: TabBarHeight + Spacing.five,
    gap: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginBottom: -Spacing.five },
  hero: { alignItems: 'center', gap: Spacing.four },
  ring: { width: 128, height: 128, borderRadius: 64, padding: 4 },
  ringInner: { flex: 1, borderRadius: 60, borderWidth: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  follow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five },
  divider: { width: 1, height: 32, opacity: 0.4 },
  statGrid: { flexDirection: 'row', gap: Spacing.three },
  statCard: { flex: 1, height: 128, borderRadius: Radius.md, padding: Spacing.four - 4, justifyContent: 'space-between', overflow: 'hidden' },
  statIcon: { position: 'absolute', right: -12, bottom: -12 },
});
