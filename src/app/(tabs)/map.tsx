import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarouselEventCard } from '@/components/event-cards';
import { FilterButton, FilterSheet, type FilterSheetHandle, type FilterSheetState } from '@/components/filter-sheet';
import { Icon } from '@/components/icon';
import { EventMap, type EventMapControls, type MapRegion } from '@/components/map/event-map';
import { HeaderActions } from '@/components/top-bar';
import { AppText, Chip, glow, NowToggle, SearchField, SegmentedControl } from '@/components/ui';
import { Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { usePreferences } from '@/ctx/preferences';
import { useAppTheme } from '@/ctx/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useQuery } from '@/hooks/use-query';
import { FALLBACK_COORDS, useUserLocation } from '@/hooks/use-user-location';
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories';
import { eventsApi, type Coords } from '@/lib/endpoints';
import { activeFilterCount, DEFAULT_FILTERS, matchesFilters, priceParam, type EventFilters } from '@/lib/event-filters';
import { hasEnded, isLive, timeWindow, UPCOMING_DAYS, type When } from '@/lib/format';
import { searchTerms } from '@/lib/search';
import type { EventCategory, MapPin } from '@/lib/types';

/** Per time-window copy: segment label, sheet title, and what "nothing found" says. */
const WHEN_COPY: Record<When, { label: string; title: string; empty: string }> = {
  today: { label: 'Hoy', title: 'Eventos de hoy', empty: 'No hay más eventos hoy' },
  tomorrow: { label: 'Mañana', title: 'Eventos de mañana', empty: 'No hay eventos mañana' },
  weekend: { label: 'Finde', title: 'Este fin de semana', empty: 'No hay eventos este fin de semana' },
  upcoming: { label: 'Próximos', title: 'Próximos eventos', empty: `No hay eventos en los próximos ${UPCOMING_DAYS} días` },
};
const WHEN_OPTIONS = (Object.keys(WHEN_COPY) as When[]).map((value) => ({ value, label: WHEN_COPY[value].label }));

const KM_PER_DEGREE = 111;
/** Zoom when the map opens and on "Mi ubicación": a close-up of the neighborhood. Searching still uses the distance preference. */
const VIEW_RADIUS_KM = 3;

/** Radius (km) of the circle around the region's center that covers it to the corners; API max 100. */
function regionRadiusKm({ center, latitudeDelta, longitudeDelta }: MapRegion) {
  const dy = (latitudeDelta / 2) * KM_PER_DEGREE;
  const dx = (longitudeDelta / 2) * KM_PER_DEGREE * Math.cos((center.lat * Math.PI) / 180);
  return Math.min(100, Math.max(0.5, Math.ceil(Math.hypot(dx, dy) * 10) / 10));
}

/** True when the pin is inside the visible rectangle (the API searched the circle around it). */
function inRegion({ center, latitudeDelta, longitudeDelta }: MapRegion, p: Pick<MapPin, 'latitude' | 'longitude'>) {
  return Math.abs(p.latitude - center.lat) <= latitudeDelta / 2 && Math.abs(p.longitude - center.lng) <= longitudeDelta / 2;
}

export default function MapScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { coords, locate } = useUserLocation();
  const { radiusKm, setRadiusKm } = usePreferences();
  const [category, setCategory] = useState<EventCategory | undefined>();
  const [liveOnly, setLiveOnly] = useState(false);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const filterSheet = useRef<FilterSheetHandle>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recentered, setCenter] = useState<Coords | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [when, setWhen] = useState<When>('today');
  const center = recentered ?? coords ?? FALLBACK_COORDS;
  const mapControls = useRef<EventMapControls>(null);
  // "Buscar en esta zona": `movedTo` is where the user panned/zoomed (shows the button);
  // `area` is the zone they chose to search. Without an area we search around the user.
  const [movedTo, setMovedTo] = useState<MapRegion | null>(null);
  const [area, setArea] = useState<MapRegion | null>(null);
  const origin = area?.center ?? coords;
  const searchRadius = area ? regionRadiusKm(area) : radiusKm;

  // Strings that only change with `when` or when the day rolls over — safe as query deps.
  const range = timeWindow(when);
  // A search looks at every event from today on, whatever Hoy/Próximos says.
  const query = useDebouncedValue(search.trim());
  const searching = searchTerms(query).length > 0;
  const searchFrom = timeWindow('today').from;
  const isFree = priceParam(filters.price);
  // Pins carry no price: with a search or a price filter, the (server-filtered) cards double as pins.
  const cardsAsPins = searching || isFree !== undefined;

  const pins = useQuery(
    origin && !cardsAsPins ? () => eventsApi.mapPins(origin, searchRadius, category, range) : null,
    [origin, category, range.from, cardsAsPins, searchRadius],
  );
  const nearby = useQuery(
    origin
      ? () =>
          eventsApi.nearby(
            origin,
            searching
              ? { radiusKm: searchRadius, category, isFree, limit: 50, from: searchFrom, q: query }
              : { radiusKm: searchRadius, category, isFree, limit: 50, ...range },
          )
      : null,
    [origin, category, isFree, range.from, searching ? query : '', searchFrom, searchRadius],
  );

  // Windows start at midnight, so drop today's events that already ended. "Ahora", attendance,
  // time of day and the zone's exact edges aren't API params: filter what came back.
  const keep = (e: MapPin) =>
    !hasEnded(e) && (!liveOnly || isLive(e)) && matchesFilters(e, filters) && (!area || inRegion(area, e));
  const matchingCards = (nearby.data?.data ?? []).filter(keep).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const visiblePins: MapPin[] = cardsAsPins ? matchingCards : (pins.data ?? []).filter(keep);
  const filterCount = activeFilterCount(filters);
  const where = area ? 'en esta zona' : `a menos de ${radiusKm} km`;
  // Selected pin's card goes first so the sheet reflects the tap.
  const cards = selectedId
    ? [...matchingCards].sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId))
    : matchingCards;

  const changeWhen = (next: When) => {
    setWhen(next);
    setSelectedId(null);
    // Only today's events can be happening now.
    if (next !== 'today') setLiveOnly(false);
  };

  const applyFilters = (next: FilterSheetState) => {
    changeWhen(next.when);
    setFilters(next.filters);
    // Distance is the shared preference (settings + Explore).
    if (next.radiusKm !== radiusKm) setRadiusKm(next.radiusKm);
  };

  const searchThisArea = () => {
    setArea(movedTo);
    setMovedTo(null);
    setSelectedId(null);
  };

  /** Back to "around me": drop the chosen zone and fly to the user's location. */
  const recenter = async () => {
    setArea(null);
    setMovedTo(null);
    setCenter(await locate());
    setFocusKey((k) => k + 1);
  };

  const sheet = useCollapsibleSheet();

  const selectPin = (id: string | null) => {
    setSelectedId(id);
    if (id) sheet.setOpen(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <EventMap
        center={center}
        pins={visiblePins}
        selectedId={selectedId}
        onSelectPin={selectPin}
        radiusKm={VIEW_RADIUS_KM}
        controls={mapControls}
        focusKey={focusKey}
        onRegionChange={(region, byUser) => byUser && setMovedTo(region)}
      />

      {/* Search + "Ahora" + filters + bell */}
      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]} pointerEvents="box-none">
        <SearchField
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          right={
            <>
              {when === 'today' && <NowToggle value={liveOnly} onChange={setLiveOnly} />}
              <FilterButton count={filterCount} onPress={() => filterSheet.current?.open()} />
              <HeaderActions />
            </>
          }
        />

        {!searching && (
          <SegmentedControl options={WHEN_OPTIONS} value={when} onChange={changeWhen} style={{ marginLeft: Spacing.three }} />
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

        {/* Shown once the user moves the map; searches exactly what's on screen. */}
        {movedTo && (
          <Pressable
            onPress={searchThisArea}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.areaBtn,
              { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
              glow('#000', 0.25, 16),
            ]}>
            <Icon name="search" size={16} color={colors.primary} />
            <AppText variant="bodyStrong">Buscar en esta zona</AppText>
          </Pressable>
        )}
      </View>

      {/* Zoom + locate me — ride along with the sheet */}
      <Animated.View style={[styles.fab, { bottom: sheet.height + Spacing.three }, sheet.followStyle]}>
        <View style={[styles.zoom, { backgroundColor: colors.glass }]}>
          <Pressable accessibilityLabel="Acercar" hitSlop={4} onPress={() => mapControls.current?.zoomBy(1)} style={styles.zoomBtn}>
            <Icon name="add" size={22} color={colors.text} />
          </Pressable>
          <View style={[styles.zoomDivider, { backgroundColor: colors.outlineVariant }]} />
          <Pressable accessibilityLabel="Alejar" hitSlop={4} onPress={() => mapControls.current?.zoomBy(-1)} style={styles.zoomBtn}>
            <Icon name="remove" size={22} color={colors.text} />
          </Pressable>
        </View>
        <Pressable
          accessibilityLabel="Mi ubicación"
          onPress={recenter}
          style={[styles.fabBtn, { backgroundColor: colors.glass }, glow(colors.secondary, 0.35, 30)]}>
          <Icon name="myLocation" size={24} color={colors.secondary} />
        </Pressable>
      </Animated.View>

      {/* Bottom sheet: drag or tap the header to collapse/expand */}
      <Animated.View
        onLayout={sheet.onSheetLayout}
        style={[styles.sheet, { backgroundColor: colors.overlay, paddingBottom: TabBarHeight + Spacing.three }, sheet.followStyle]}>
        <View {...sheet.panHandlers} onLayout={sheet.onGrabberLayout}>
          <Pressable
            onPress={sheet.toggle}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={sheet.open ? 'Ocultar eventos' : 'Mostrar eventos'}
            style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: colors.surfaceHighest }]} />
          </Pressable>
          <View style={styles.sheetHeader}>
            <Pressable onPress={sheet.toggle} style={styles.sheetTitle}>
              <View>
                <AppText variant="heading">
                  {searching ? 'Resultados' : WHEN_COPY[when].title}
                </AppText>
                <AppText variant="label" color={colors.textMuted} style={{ marginTop: 2 }}>
                  {nearby.loading
                    ? 'Buscando…'
                    : `${cards.length} ${cards.length === 1 ? 'evento' : 'eventos'}${
                        searching ? ' · desde hoy' : when === 'upcoming' ? ` · ${UPCOMING_DAYS} días` : ''
                      }${area ? ' · en esta zona' : ''}`}
                </AppText>
              </View>
              <Animated.View style={sheet.chevronStyle}>
                <Icon name="chevronDown" size={22} color={colors.textMuted} />
              </Animated.View>
            </Pressable>
          <Pressable onPress={() => router.navigate('/explore')} style={[styles.listBtn, { backgroundColor: colors.surfaceHighest }]}>
            <AppText variant="label" color={colors.secondary}>
              Ver lista
            </AppText>
          </Pressable>
          </View>
        </View>
        {nearby.error ? (
          <AppText variant="caption" color={colors.error} style={{ paddingHorizontal: Spacing.four }}>
            {nearby.error.message}
          </AppText>
        ) : cards.length === 0 && !nearby.loading ? (
          <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.two }}>
            <AppText variant="caption">
              {searching
                ? `Nada coincide con “${query}” ${where}. Prueba con otra palabra o categoría.`
                : `${WHEN_COPY[when].empty} ${where} con estos filtros.`}
            </AppText>
            {searching ? null : when !== 'upcoming' ? (
              <Pressable onPress={() => changeWhen('upcoming')}>
                <AppText variant="bodyStrong" color={colors.primary}>
                  Ver próximos eventos →
                </AppText>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push('/create-event')}>
                <AppText variant="bodyStrong" color={colors.primary}>
                  + Crea el primero
                </AppText>
              </Pressable>
            )}
          </View>
        ) : (
          <FlatList
            horizontal
            data={cards}
            keyExtractor={(e) => e.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.four, gap: Spacing.three }}
            renderItem={({ item }) => <CarouselEventCard event={item} />}
          />
        )}
      </Animated.View>

      <FilterSheet ref={filterSheet} value={{ radiusKm, when, filters }} onApply={applyFilters} />
    </View>
  );
}

/**
 * Bottom-sheet state: `offset` is how far the sheet is pushed down (0 = open).
 * When collapsed only the grabber (handle + header) peeks above the tab bar.
 */
function useCollapsibleSheet() {
  const [open, setOpenState] = useState(true);
  // Rendered height, so siblings (the locate FAB) can sit right above the sheet.
  const [height, setHeight] = useState(TabBarHeight + 290);
  const offset = useSharedValue(0);
  const closedOffset = useSharedValue(0);
  const sheetHeight = useRef(0);
  const grabberBottom = useRef(0);
  const dragStart = useSharedValue(0);

  const recalc = () => {
    closedOffset.set(Math.max(0, sheetHeight.current - grabberBottom.current - TabBarHeight));
    if (!open) offset.set(closedOffset.get());
  };

  const setOpen = (next: boolean) => {
    setOpenState(next);
    offset.set(withTiming(next ? 0 : closedOffset.get(), { duration: 260 }));
  };

  const [panResponder] = useState(() =>
    PanResponder.create({
      // Let taps reach the Pressables; claim only vertical drags.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        dragStart.set(offset.get());
      },
      onPanResponderMove: (_, g) => {
        offset.set(Math.min(closedOffset.get(), Math.max(0, dragStart.get() + g.dy)));
      },
      onPanResponderRelease: (_, g) => {
        const shouldClose = g.vy > 0.5 || (g.vy > -0.5 && offset.get() > closedOffset.get() / 2);
        setOpenState(!shouldClose);
        offset.set(withTiming(shouldClose ? closedOffset.get() : 0, { duration: 200 }));
      },
    }),
  );

  const followStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(offset.get(), [0, Math.max(1, closedOffset.get())], [0, 180])}deg` }],
  }));

  return {
    open,
    height,
    setOpen,
    toggle: () => setOpen(!open),
    panHandlers: panResponder.panHandlers,
    followStyle,
    chevronStyle,
    onSheetLayout: (e: { nativeEvent: { layout: { height: number } } }) => {
      sheetHeight.current = e.nativeEvent.layout.height;
      setHeight(e.nativeEvent.layout.height);
      recalc();
    },
    onGrabberLayout: (e: { nativeEvent: { layout: { y: number; height: number } } }) => {
      grabberBottom.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
      recalc();
    },
  };
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, gap: Spacing.two },
  search: { marginHorizontal: Spacing.three },
  chips: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingVertical: 4 },
  fab: { position: 'absolute', right: Spacing.four, alignItems: 'center', gap: Spacing.three },
  zoom: { width: 44, borderRadius: 22, alignItems: 'center', overflow: 'hidden' },
  zoomBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { width: 24, height: StyleSheet.hairlineWidth },
  areaBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    borderRadius: Radius.full,
    marginTop: Spacing.one,
  },
  fabBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
  handleArea: { paddingTop: Spacing.three, paddingBottom: Spacing.three, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: Spacing.four, marginBottom: Spacing.three },
  sheetTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  listBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm },
});
