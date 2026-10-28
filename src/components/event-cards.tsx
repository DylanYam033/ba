import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { CATEGORIES } from '@/lib/categories';
import { compactNumber, formatDayTime, formatDistance, formatShortDate, isLive } from '@/lib/format';
import type { EventCategory, EventSummary } from '@/lib/types';

import { EventCover } from './event-cover';
import { Icon } from './icon';
import { AppText, hexToRgba, LiveBadge, Pill } from './ui';

type CardEvent = EventSummary & { locationName?: string; distance_km?: number; location?: { name: string } };

const venueOf = (e: CardEvent) => e.locationName ?? e.location?.name ?? '';
const open = (id: string) => router.push({ pathname: '/event/[id]', params: { id } });

export function CategoryBadge({ category }: { category: EventCategory }) {
  const meta = CATEGORIES[category] ?? CATEGORIES.other;
  return (
    <View style={[styles.badge, { backgroundColor: hexToRgba(meta.color, 0.18) }]}>
      <Icon name={meta.icon} size={14} color={meta.color} />
      <AppText variant="label" color={meta.color} style={{ fontSize: 10 }}>
        {meta.label}
      </AppText>
    </View>
  );
}

export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name: string; size?: number }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceHighest }]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={{ fontFamily: Fonts.headline, fontSize: size * 0.4, color: colors.primary }}>
          {name.slice(0, 1).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

/** Large "Event Slate" used in Explore and My Events. */
export function FeaturedEventCard({ event }: { event: CardEvent }) {
  const { colors } = useAppTheme();
  const distance = formatDistance(event.distance_km);
  return (
    <Pressable
      onPress={() => open(event.id)}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surfaceContainer, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <View>
        <EventCover uri={event.coverUrl} category={event.category} style={{ height: 220 }} emojiSize={72} />
        <View style={styles.overlayRow}>
          <CategoryBadge category={event.category} />
          {distance && (
            <Pill>
              <Icon name="pin" size={12} color={colors.secondary} />
              <AppText variant="label" color={colors.text} style={{ fontSize: 10 }}>
                {distance}
              </AppText>
            </Pill>
          )}
        </View>
        {isLive(event) && (
          <View style={{ position: 'absolute', top: Spacing.three, right: Spacing.three }}>
            <LiveBadge />
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <AppText variant="heading" numberOfLines={2} style={{ fontSize: 22, lineHeight: 26 }}>
          {event.title}
        </AppText>
        <View style={styles.metaRow}>
          <Icon name="calendar" size={16} color={colors.primary} />
          <AppText variant="caption">{formatDayTime(event.startAt)}</AppText>
        </View>
        <View style={styles.metaRow}>
          <Icon name="pin" size={16} color={colors.secondary} />
          <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
            {venueOf(event)}
          </AppText>
          <AppText variant="label" color={colors.primary}>
            {compactNumber(event.currentAttendees)} van
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

/** Horizontal row card ("Happening now", "Past"). */
export function RowEventCard({ event, dimmed }: { event: CardEvent; dimmed?: boolean }) {
  const { colors } = useAppTheme();
  const live = isLive(event);
  const meta = CATEGORIES[event.category] ?? CATEGORIES.other;
  const distance = formatDistance(event.distance_km);
  return (
    <Pressable
      onPress={() => open(event.id)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surfaceContainer, opacity: dimmed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}>
      <EventCover uri={event.coverUrl} category={event.category} style={styles.rowCover} fade={false} emojiSize={40} />
      <View style={styles.rowBody}>
        <View style={styles.metaRow}>
          <AppText variant="label" color={live ? colors.tertiary : meta.color} style={{ fontSize: 10, flex: 1 }}>
            {live ? 'En curso' : meta.label}
          </AppText>
          {distance && (
            <AppText variant="label" style={{ fontSize: 10 }}>
              {distance}
            </AppText>
          )}
        </View>
        <AppText variant="heading" numberOfLines={2} style={{ fontSize: 17, lineHeight: 21 }}>
          {event.title}
        </AppText>
        <View style={styles.metaRow}>
          <Icon name="calendar" size={14} color={colors.textMuted} />
          <AppText variant="label" style={{ fontSize: 10 }}>
            {formatShortDate(event.startAt)}
          </AppText>
          <Icon name="pin" size={14} color={colors.textMuted} />
          <AppText variant="label" numberOfLines={1} style={{ fontSize: 10, flex: 1 }}>
            {venueOf(event)}
          </AppText>
        </View>
        <AppText variant="caption">{event.currentAttendees} asistentes</AppText>
      </View>
    </Pressable>
  );
}

/** Narrow card for horizontal carousels (map bottom sheet, similar events). */
export function CarouselEventCard({ event, width = 260 }: { event: CardEvent; width?: number }) {
  const { colors } = useAppTheme();
  const distance = formatDistance(event.distance_km);
  return (
    <Pressable onPress={() => open(event.id)} style={({ pressed }) => ({ width, opacity: pressed ? 0.85 : 1 })}>
      <View style={styles.carouselImage}>
        <EventCover uri={event.coverUrl} category={event.category} style={StyleSheet.absoluteFill} fade={false} />
        {isLive(event) && (
          <View style={{ position: 'absolute', top: 12, left: 12 }}>
            <LiveBadge small />
          </View>
        )}
        <Pill style={{ position: 'absolute', bottom: 12, right: 12 }}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <AppText variant="label" color={colors.text} style={{ fontSize: 10 }}>
            {event.currentAttendees} van
          </AppText>
        </Pill>
      </View>
      <AppText variant="heading" numberOfLines={1} style={{ fontSize: 16, marginTop: Spacing.two }}>
        {event.title}
      </AppText>
      <View style={[styles.metaRow, { marginTop: 4 }]}>
        <AppText variant="label" color={colors.secondary} style={{ fontSize: 10 }}>
          {formatDayTime(event.startAt)}
        </AppText>
        {distance && (
          <AppText variant="label" style={{ fontSize: 10 }}>
            {distance}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: Radius.md, overflow: 'hidden' },
  overlayRow: { position: 'absolute', top: Spacing.three, left: Spacing.three, flexDirection: 'row', gap: Spacing.two },
  cardBody: { padding: Spacing.four - 4, gap: Spacing.two },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', borderRadius: Radius.md, overflow: 'hidden', minHeight: 132 },
  rowCover: { width: 116 },
  rowBody: { flex: 1, padding: Spacing.three, gap: 6, justifyContent: 'center' },
  carouselImage: { height: 160, borderRadius: Radius.md - 4, overflow: 'hidden' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
