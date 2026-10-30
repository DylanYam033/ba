import { router } from 'expo-router';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { RowEventCard } from '@/components/event-cards';
import { OrganizedEvents } from '@/components/organized-events';
import { ProfileHero, StatCard } from '@/components/profile-header';
import { NotificationsBell, TopBar } from '@/components/top-bar';
import { EmptyState, GhostButton, GradientButton, IconButton, SectionHeader } from '@/components/ui';
import { MaxContentWidth, Spacing, TabBarHeight } from '@/constants/theme';
import { useAuth, useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { useQuery } from '@/hooks/use-query';
import { usersApi } from '@/lib/endpoints';

export default function Profile() {
  const { colors, scheme, toggle } = useAppTheme();
  const { signOut } = useAuth();
  const user = useCurrentUser();
  const isBusiness = user.accountType === 'business';

  const data = useQuery(async () => {
    const [stats, saved, created] = await Promise.all([
      usersApi.stats(user.id),
      usersApi.myEvents('saved'),
      usersApi.events(user.id),
    ]);
    return { stats, saved, created };
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
  const created = data.data?.created ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar right={<NotificationsBell />} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} tintColor={colors.secondary} />}>
        <View style={styles.actions}>
          <IconButton icon={scheme === 'dark' ? 'lightMode' : 'darkMode'} label="Cambiar tema" onPress={toggle} color={colors.secondary} />
          <IconButton icon="settings" label="Editar perfil" onPress={() => router.push('/edit-profile')} />
        </View>

        <ProfileHero user={user} stats={stats} emptyBio="Aún no tienes bio. Cuéntale a la ciudad qué te mueve." />

        {isBusiness && <GradientButton title="Crear evento" icon="add" onPress={() => router.push('/create-event')} />}

        <View style={styles.statGrid}>
          <StatCard label="Eventos asistidos" value={stats?.eventsAttended} icon="ticket" color={colors.primary} />
          <StatCard label="Fotos compartidas" value={stats?.photosShared} icon="photos" color={colors.secondary} />
        </View>

        <View style={{ gap: Spacing.three }}>
          <SectionHeader title="Mis eventos creados" />
          {data.loading ? null : (
            <OrganizedEvents
              events={created}
              emptyTitle="Aún no has creado eventos"
              emptyMessage="Publica tu primer evento y aparecerá aquí."
              emptyAction="Crear evento"
              onEmptyAction={() => router.push('/create-event')}
            />
          )}
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
  statGrid: { flexDirection: 'row', gap: Spacing.three },
});
