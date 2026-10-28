import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, CarouselEventCard } from '@/components/event-cards';
import { Icon } from '@/components/icon';
import { EventMap } from '@/components/map/event-map';
import { AppText, Chip, glow } from '@/components/ui';
import { Fonts, Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { useQuery } from '@/hooks/use-query';
import { FALLBACK_COORDS, useUserLocation } from '@/hooks/use-user-location';
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories';
import { eventsApi, type Coords } from '@/lib/endpoints';
import { isLive } from '@/lib/format';
import type { EventCategory } from '@/lib/types';

const RADIUS_KM = 25;

export default function MapScreen() {
  const { colors } = useAppTheme();
  const user = useCurrentUser();
  const insets = useSafeAreaInsets();
  const { coords, locate } = useUserLocation();
  const [category, setCategory] = useState<EventCategory | undefined>();
  const [liveOnly, setLiveOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recentered, setCenter] = useState<Coords | null>(null);
  const center = recentered ?? coords ?? FALLBACK_COORDS;

  const pins = useQuery(coords ? () => eventsApi.mapPins(coords, RADIUS_KM, category) : null, [coords, category]);
  const nearby = useQuery(
    coords ? () => eventsApi.nearby(coords, { radiusKm: RADIUS_KM, category, limit: 30 }) : null,
    [coords, category],
  );

  const q = search.trim().toLowerCase();
  const visiblePins = useMemo(
    () => (pins.data ?? []).filter((p) => (!liveOnly || p.status === 'live') && (!q || p.title.toLowerCase().includes(q))),
    [pins.data, liveOnly, q],
  );
  const cards = useMemo(() => {
    const list = (nearby.data?.data ?? []).filter((e) => (!liveOnly || isLive(e)) && (!q || e.title.toLowerCase().includes(q)));
    // Selected pin's card goes first so the sheet reflects the tap.
    return selectedId ? [...list].sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId)) : list;
  }, [nearby.data, liveOnly, q, selectedId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <EventMap center={center} pins={visiblePins} selectedId={selectedId} onSelectPin={setSelectedId} radiusKm={6} />

      {/* Search + live toggle + avatar */}
      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]} pointerEvents="box-none">
        <View style={[styles.search, { backgroundColor: colors.glass }]}>
          <Icon name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Encuentra el pulso..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          <Pressable
            onPress={() => setLiveOnly((v) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: liveOnly }}
            style={[styles.liveToggle, { backgroundColor: liveOnly ? colors.live : 'transparent', borderColor: colors.live }]}>
            <View style={[styles.liveDot, { backgroundColor: liveOnly ? '#fff' : colors.live }]} />
            <AppText variant="label" color={liveOnly ? '#fff' : colors.text} style={{ fontSize: 10 }}>
              En vivo
            </AppText>
          </Pressable>
          <Pressable onPress={() => router.navigate('/profile')} accessibilityLabel="Perfil">
            <Avatar uri={user.avatarUrl} name={user.username} size={32} />
          </Pressable>
        </View>

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

      {/* Locate me */}
      <Pressable
        accessibilityLabel="Mi ubicación"
        onPress={async () => setCenter(await locate())}
        style={[styles.fab, { backgroundColor: colors.glass, bottom: TabBarHeight + 290 }, glow(colors.secondary, 0.35, 30)]}>
        <Icon name="myLocation" size={24} color={colors.secondary} />
      </Pressable>

      {/* Bottom sheet */}
      <View style={[styles.sheet, { backgroundColor: colors.overlay, paddingBottom: TabBarHeight + Spacing.three }]}>
        <View style={[styles.handle, { backgroundColor: colors.surfaceHighest }]} />
        <View style={styles.sheetHeader}>
          <View>
            <AppText variant="heading">Pulso cercano</AppText>
            <AppText variant="label" color={colors.textMuted} style={{ marginTop: 2 }}>
              {nearby.loading ? 'Buscando…' : `${cards.length} eventos encontrados`}
            </AppText>
          </View>
          <Pressable onPress={() => router.navigate('/explore')} style={[styles.listBtn, { backgroundColor: colors.surfaceHighest }]}>
            <AppText variant="label" color={colors.secondary}>
              Ver lista
            </AppText>
          </Pressable>
        </View>
        {nearby.error ? (
          <AppText variant="caption" color={colors.error} style={{ paddingHorizontal: Spacing.four }}>
            {nearby.error.message}
          </AppText>
        ) : cards.length === 0 && !nearby.loading ? (
          <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.two }}>
            <AppText variant="caption">No hay eventos en {RADIUS_KM} km con estos filtros.</AppText>
            <Pressable onPress={() => router.push('/create-event')}>
              <AppText variant="bodyStrong" color={colors.primary}>
                + Crea el primero
              </AppText>
            </Pressable>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, gap: Spacing.two },
  search: {
    marginHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingLeft: Spacing.three,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 15, paddingVertical: 6 },
  liveToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  chips: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingVertical: 4 },
  fab: { position: 'absolute', right: Spacing.four, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingTop: Spacing.three },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: Spacing.four, marginBottom: Spacing.three },
  listBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm },
});
