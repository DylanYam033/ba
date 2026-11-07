import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeaturedEventCard, RowEventCard } from '@/components/event-cards';
import { FilterButton, FilterSheet, type FilterSheetHandle, type FilterSheetState } from '@/components/filter-sheet';
import { HeaderActions } from '@/components/top-bar';
import { Chip, EmptyState, ErrorState, LoadingState, NowToggle, SearchField, SectionHeader, SegmentedControl } from '@/components/ui';
import { MaxContentWidth, Spacing, TabBarHeight } from '@/constants/theme';
import { usePreferences } from '@/ctx/preferences';
import { useAppTheme } from '@/ctx/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useQuery } from '@/hooks/use-query';
import { useUserLocation } from '@/hooks/use-user-location';
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories';
import { eventsApi } from '@/lib/endpoints';
import { activeFilterCount, DEFAULT_FILTERS, matchesFilters, priceParam, type EventFilters } from '@/lib/event-filters';
import { groupByDay, hasEnded, isLive, timeWindow, UPCOMING_DAYS, type When } from '@/lib/format';
import { searchTerms } from '@/lib/search';
import type { EventCategory, NearbyEvent } from '@/lib/types';

const TABS: { value: When; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'tomorrow', label: 'Mañana' },
  { value: 'weekend', label: 'Finde' },
  { value: 'upcoming', label: 'Próximos' },
];

/** Empty-state copy for the non-today windows (today has its own, with a shortcut). */
const EMPTY_WINDOW: Record<Exclude<When, 'today'>, { title: string; message: string }> = {
  tomorrow: { title: 'Mañana está tranquilo', message: 'No hay eventos mañana' },
  weekend: { title: 'Finde sin planes', message: 'No hay eventos este fin de semana' },
  upcoming: { title: 'Semana tranquila', message: `No hay eventos en los próximos ${UPCOMING_DAYS} días` },
};

export default function Explore() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { coords } = useUserLocation();
  const { radiusKm, setRadiusKm } = usePreferences();
  const [tab, setTab] = useState<When>('today');
  const [category, setCategory] = useState<EventCategory | undefined>();
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [nowOnly, setNowOnly] = useState(false);
  const [search, setSearch] = useState('');
  const filterSheet = useRef<FilterSheetHandle>(null);
  const range = timeWindow(tab);
  // Same as the map: a search covers every event from today on, ignoring the date window.
  const query = useDebouncedValue(search.trim());
  const searching = searchTerms(query).length > 0;
  const searchFrom = timeWindow('today').from;
  const isFree = priceParam(filters.price);

  const feed = useQuery(
    coords
      ? async () => {
          const common = { radiusKm, category, isFree, limit: 50 };
          if (searching) {
            const results = await eventsApi.nearby(coords, { ...common, from: searchFrom, q: query });
            return { trending: [], nearby: results.data };
          }
          const [trending, nearby] = await Promise.all([
            // Trending ranks the last 2 hours of joins, which only means something for today.
            tab === 'today' ? eventsApi.trending(coords, radiusKm, 5) : Promise.resolve([]),
            eventsApi.nearby(coords, { ...common, ...range }),
          ]);
          return { trending, nearby: nearby.data };
        }
      : null,
    [coords, tab, range.from, radiusKm, category, isFree, searching ? query : '', searchFrom],
  );

  // Attendance, time of day and "Ahora" aren't API params: filter what came back.
  const keep = (e: NearbyEvent) => !hasEnded(e) && matchesFilters(e, filters) && (!nowOnly || isLive(e));
  const nearby = (feed.data?.nearby ?? []).filter(keep).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const distanceById = new Map(nearby.map((e) => [e.id, e.distance_km]));
  // Trending ignores the date, category and price params: apply them here.
  const trending = (feed.data?.trending ?? []).filter(
    (e) =>
      keep(e) &&
      e.startAt < range.to &&
      (!category || e.category === category) &&
      (isFree === undefined || e.isFree === isFree),
  );
  const trendingIds = new Set(trending.map((e) => e.id));
  const now = nearby.filter((e) => isLive(e) && !trendingIds.has(e.id));
  const laterToday = nearby.filter((e) => !isLive(e) && !trendingIds.has(e.id));
  const filterCount = activeFilterCount(filters);

  const changeTab = (next: When) => {
    setTab(next);
    // Only today's events can be happening now.
    if (next !== 'today') setNowOnly(false);
  };

  const applyFilters = (next: FilterSheetState) => {
    changeTab(next.when);
    setFilters(next.filters);
    // Distance is the shared preference (settings + map), not an Explore-only value.
    if (next.radiusKm !== radiusKm) setRadiusKm(next.radiusKm);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Same header as the map: search (+ "Ahora", filters, bell), days, categories */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          right={
            <>
              {tab === 'today' && <NowToggle value={nowOnly} onChange={setNowOnly} />}
              <FilterButton count={filterCount} onPress={() => filterSheet.current?.open()} />
              <HeaderActions />
            </>
          }
        />

        {!searching && (
          <SegmentedControl options={TABS} value={tab} onChange={changeTab} style={{ marginLeft: Spacing.three }} />
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Todo" active={!category} onPress={() => setCategory(undefined)} />
          {CATEGORY_KEYS.map((key) => (
            <Chip
              key={key}
              label={CATEGORIES[key].label}
              icon={CATEGORIES[key].icon}
              iconColor={CATEGORIES[key].color}
              active={category === key}
              onPress={() => setCategory(category === key ? undefined : key)}
            />
          ))}
        </ScrollView>
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
                  onAction={() => changeTab('upcoming')}
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
              title={EMPTY_WINDOW[tab].title}
              message={`${EMPTY_WINDOW[tab].message} a menos de ${radiusKm} km con estos filtros. ¡Sé el primero en publicar uno!`}
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

      <FilterSheet ref={filterSheet} value={{ radiusKm, when: tab, filters }} onApply={applyFilters} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Mirrors the map's header (styles.top / search / chips in map.tsx).
  header: { gap: Spacing.two, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  search: { marginHorizontal: Spacing.three },
  chips: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingVertical: 4 },
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
});
