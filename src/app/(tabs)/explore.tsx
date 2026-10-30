import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { FeaturedEventCard, RowEventCard } from '@/components/event-cards';
import { Icon } from '@/components/icon';
import { TopBar } from '@/components/top-bar';
import { EmptyState, ErrorState, glow, LoadingState, SearchField, SectionHeader, SegmentedControl } from '@/components/ui';
import { MaxContentWidth, Spacing, TabBarHeight } from '@/constants/theme';
import { usePreferences } from '@/ctx/preferences';
import { useAppTheme } from '@/ctx/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useQuery } from '@/hooks/use-query';
import { useUserLocation } from '@/hooks/use-user-location';
import { eventsApi } from '@/lib/endpoints';
import { formatDayHeading, hasEnded, isLive, timeWindow, UPCOMING_DAYS, type When } from '@/lib/format';
import { searchTerms } from '@/lib/search';
import type { NearbyEvent } from '@/lib/types';

const TABS: { value: When; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'upcoming', label: 'Próximos' },
];

export default function Explore() {
  const { colors } = useAppTheme();
  const { coords } = useUserLocation();
  const { radiusKm } = usePreferences();
  const [tab, setTab] = useState<When>('today');
  const [search, setSearch] = useState('');
  const range = timeWindow(tab);
  // Same as the map: a search covers every event from today on, ignoring the tab.
  const query = useDebouncedValue(search.trim());
  const searching = searchTerms(query).length > 0;
  const searchFrom = timeWindow('today').from;

  const feed = useQuery(
    coords
      ? async () => {
          if (searching) {
            const results = await eventsApi.nearby(coords, { radiusKm, limit: 50, from: searchFrom, q: query });
            return { trending: [], nearby: results.data };
          }
          const [trending, nearby] = await Promise.all([
            // Trending ranks the last 2 hours of joins, which only means something for today.
            tab === 'today' ? eventsApi.trending(coords, radiusKm, 5) : Promise.resolve([]),
            eventsApi.nearby(coords, { radiusKm, limit: 50, ...range }),
          ]);
          return { trending, nearby: nearby.data };
        }
      : null,
    [coords, tab, range.from, radiusKm, searching ? query : '', searchFrom],
  );

  const nearby = (feed.data?.nearby ?? [])
    .filter((e) => !hasEnded(e))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const distanceById = new Map(nearby.map((e) => [e.id, e.distance_km]));
  // Trending isn't date-filtered by the API: keep only what's still on today.
  const trending = (feed.data?.trending ?? []).filter((e) => !hasEnded(e) && e.startAt < range.to);
  const trendingIds = new Set(trending.map((e) => e.id));
  const now = nearby.filter((e) => isLive(e) && !trendingIds.has(e.id));
  const laterToday = nearby.filter((e) => !isLive(e) && !trendingIds.has(e.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar />
      <View style={styles.header}>
        <SearchField value={search} onChangeText={setSearch} />
        {!searching && <SegmentedControl options={TABS} value={tab} onChange={setTab} />}
      </View>
      {feed.loading || !coords ? (
        <LoadingState />
      ) : feed.error && !feed.data ? (
        <ErrorState error={feed.error} onRetry={feed.refresh} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.secondary} />}>
          {searching ? (
            nearby.length === 0 ? (
              <EmptyState
                icon="search"
                title="Sin resultados"
                message={`Nada coincide con “${query}” a menos de ${radiusKm} km. Prueba con otra palabra, categoría, lugar o etiqueta.`}
              />
            ) : (
              groupByDay(nearby).map(([day, events]) => (
                <View key={day} style={styles.section}>
                  <SectionHeader
                    eyebrow={`${events.length} ${events.length === 1 ? 'resultado' : 'resultados'}`}
                    eyebrowColor={colors.primary}
                    title={day}
                  />
                  {events.map((e) => (
                    <RowEventCard key={e.id} event={e} />
                  ))}
                </View>
              ))
            )
          ) : tab === 'today' ? (
            <>
              {nearby.length === 0 && trending.length === 0 && (
                <EmptyState
                  icon="explore"
                  title="Nada más por hoy"
                  message={`No quedan eventos hoy a menos de ${radiusKm} km. Mira lo que viene esta semana.`}
                  action="Ver próximos"
                  onAction={() => setTab('upcoming')}
                />
              )}

              {trending.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader eyebrow="Lo más hot" title="🔥 Tendencia hoy" />
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

              {laterToday.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader eyebrow="Hoy" eyebrowColor={colors.primary} title="🕗 Más tarde" />
                  {laterToday.map((e) => (
                    <RowEventCard key={e.id} event={e} />
                  ))}
                </View>
              )}
            </>
          ) : nearby.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Semana tranquila"
              message={`No hay eventos en los próximos ${UPCOMING_DAYS} días a menos de ${radiusKm} km. ¡Sé el primero en publicar uno!`}
              action="Crear evento"
              onAction={() => router.push('/create-event')}
            />
          ) : (
            groupByDay(nearby).map(([day, events]) => (
              <View key={day} style={styles.section}>
                <SectionHeader
                  eyebrow={`${events.length} ${events.length === 1 ? 'evento' : 'eventos'}`}
                  eyebrowColor={colors.primary}
                  title={day}
                />
                {events.map((e) => (
                  <RowEventCard key={e.id} event={e} />
                ))}
              </View>
            ))
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

/** Events (already sorted by start) bucketed under "Mañana" / "Sábado 31 de octubre"… */
function groupByDay(events: NearbyEvent[]) {
  const groups = new Map<string, NearbyEvent[]>();
  for (const e of events) {
    const day = formatDayHeading(e.startAt);
    groups.set(day, [...(groups.get(day) ?? []), e]);
  }
  return [...groups];
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
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
