import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { FeaturedEventCard, RowEventCard } from '@/components/event-cards';
import { Icon } from '@/components/icon';
import { TopBar } from '@/components/top-bar';
import { EmptyState, ErrorState, glow, LoadingState, SectionHeader } from '@/components/ui';
import { MaxContentWidth, Spacing, TabBarHeight } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { useQuery } from '@/hooks/use-query';
import { useUserLocation } from '@/hooks/use-user-location';
import { eventsApi } from '@/lib/endpoints';
import { hasEnded, isLive } from '@/lib/format';

const RADIUS_KM = 25;

export default function Explore() {
  const { colors } = useAppTheme();
  const { coords } = useUserLocation();

  const feed = useQuery(
    coords
      ? async () => {
          const [trending, nearby] = await Promise.all([
            eventsApi.trending(coords, RADIUS_KM, 5),
            eventsApi.nearby(coords, { radiusKm: RADIUS_KM, limit: 40 }),
          ]);
          return { trending, nearby: nearby.data };
        }
      : null,
    [coords],
  );

  const trending = feed.data?.trending ?? [];
  const nearby = feed.data?.nearby ?? [];
  const distanceById = new Map(nearby.map((e) => [e.id, e.distance_km]));
  const now = nearby.filter(isLive);
  const trendingIds = new Set(trending.map((e) => e.id));
  const upcoming = nearby
    .filter((e) => !isLive(e) && !trendingIds.has(e.id) && !hasEnded(e))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar />
      {feed.loading || !coords ? (
        <LoadingState />
      ) : feed.error && !feed.data ? (
        <ErrorState error={feed.error} onRetry={feed.refresh} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.secondary} />}>
          {nearby.length === 0 && trending.length === 0 ? (
            <EmptyState
              icon="explore"
              title="Todo tranquilo por aquí"
              message={`No encontramos eventos a menos de ${RADIUS_KM} km. ¡Sé el primero en publicar uno!`}
              action="Crear evento"
              onAction={() => router.push('/create-event')}
            />
          ) : null}

          {trending.length > 0 && (
            <View style={styles.section}>
              <SectionHeader eyebrow="Lo más hot" title="🔥 Tendencia cerca de ti" />
              {trending.map((e) => (
                <FeaturedEventCard key={e.id} event={{ ...e, distance_km: distanceById.get(e.id) }} />
              ))}
            </View>
          )}

          {now.length > 0 && (
            <View style={styles.section}>
              <SectionHeader eyebrow="Ahora mismo" eyebrowColor={colors.secondary} title="⚡ Pasando ahora" />
              {now.map((e) => (
                <RowEventCard key={e.id} event={e} />
              ))}
            </View>
          )}

          {upcoming.length > 0 && (
            <View style={styles.section}>
              <SectionHeader eyebrow="Próximamente" eyebrowColor={colors.primary} title="📅 Próximos eventos" />
              {upcoming.map((e) => (
                <RowEventCard key={e.id} event={e} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <Pressable
        accessibilityLabel="Crear evento"
        onPress={() => router.push('/create-event')}
        style={({ pressed }) => [styles.fab, glow(colors.primary, 0.45, 32), { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
        <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabFill}>
          <Icon name="add" size={30} color={colors.onPrimary} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: TabBarHeight + Spacing.six,
    gap: Spacing.five + 8,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  section: { gap: Spacing.four - 4 },
  fab: { position: 'absolute', right: Spacing.four, bottom: TabBarHeight + Spacing.four, width: 60, height: 60, borderRadius: 30 },
  fabFill: { flex: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
