import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, CarouselEventCard, CategoryBadge } from '@/components/event-cards';
import { EventCover } from '@/components/event-cover';
import { Icon } from '@/components/icon';
import { EventMap } from '@/components/map/event-map';
import { BackButton } from '@/components/top-bar';
import { AppText, ErrorState, GhostButton, GradientButton, IconButton, LiveBadge, LoadingState } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { useLiveAttendees } from '@/hooks/use-live-attendees';
import { useQuery } from '@/hooks/use-query';
import { eventsApi, usersApi } from '@/lib/endpoints';
import { formatLongRange, hasEnded, isLive, priceLabel } from '@/lib/format';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const user = useCurrentUser();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<'join' | 'save' | 'cancel' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useQuery(async () => {
    const event = await eventsApi.get(id);
    const [attendees, photos, going, past, saved, similar] = await Promise.all([
      eventsApi.attendees(id, 4),
      eventsApi.photos(id),
      usersApi.myEvents('going'),
      usersApi.myEvents('past'),
      usersApi.myEvents('saved'),
      eventsApi.nearby({ lat: event.location.latitude, lng: event.location.longitude }, { radiusKm: 15, category: event.category, limit: 8 }),
    ]);
    return {
      event,
      attendees: attendees.data,
      photos: photos.data,
      isGoing: [...going, ...past].some((e) => e.id === id),
      isSaved: saved.some((e) => e.id === id),
      similar: similar.data.filter((e) => e.id !== id),
    };
  }, [id]);

  const liveCount = useLiveAttendees(id, query.data?.event.currentAttendees);

  if (query.loading) return <Shell><LoadingState /></Shell>;
  if (query.error || !query.data) return <Shell><ErrorState error={query.error ?? new Error('Evento no encontrado')} onRetry={query.refresh} /></Shell>;

  const { event, attendees, photos, isGoing, isSaved, similar } = query.data;
  const isOrganizer = event.organizerId === user.id;
  const ended = hasEnded(event);
  const count = liveCount ?? event.currentAttendees;

  const run = async (kind: 'join' | 'save', fn: () => Promise<unknown>, patch: Partial<typeof query.data>) => {
    setBusy(kind);
    setActionError(null);
    try {
      await fn();
      query.setData((d) => d && { ...d, ...patch });
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggleGoing = () =>
    run('join', isGoing ? () => eventsApi.leave(id) : () => eventsApi.join(id), {
      isGoing: !isGoing,
      event: { ...event, currentAttendees: Math.max(0, count + (isGoing ? -1 : 1)) },
    });

  const toggleSaved = () => run('save', isSaved ? () => eventsApi.unsave(id) : () => eventsApi.save(id), { isSaved: !isSaved });

  const share = () =>
    Share.share({ message: `${event.title} — ${formatLongRange(event.startAt, event.endAt)} en ${event.location.name}. Míralo en EventSpot.` });

  const cancelEvent = () => {
    const doCancel = async () => {
      setBusy('cancel');
      try {
        await eventsApi.cancel(id);
        router.back();
      } catch (e) {
        setActionError((e as Error).message);
        setBusy(null);
      }
    };
    if (Platform.OS === 'web') return doCancel();
    Alert.alert('Cancelar evento', 'Los asistentes serán notificados. Esta acción no se puede deshacer.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Cancelar evento', style: 'destructive', onPress: doCancel },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six }}>
        <EventCover uri={event.coverUrl} category={event.category} style={{ height: 380 }} emojiSize={96} />

        <View style={styles.body}>
          <View style={{ gap: Spacing.three }}>
            <View style={styles.row}>
              <CategoryBadge category={event.category} />
              {isLive(event) ? (
                <LiveBadge />
              ) : event.status === 'cancelled' ? (
                <AppText variant="label" color={colors.error}>Cancelado</AppText>
              ) : count >= 10 ? (
                <View style={styles.row}>
                  <Icon name="fire" size={16} color={colors.tertiary} />
                  <AppText variant="bodyStrong" color={colors.tertiary}>Tendencia</AppText>
                </View>
              ) : null}
            </View>
            <AppText variant="display">{event.title}</AppText>
            <View style={styles.row}>
              <Icon name="calendar" color={colors.secondary} />
              <AppText variant="body" color={colors.textSecondary} style={{ flex: 1 }}>
                {formatLongRange(event.startAt, event.endAt)}
              </AppText>
            </View>
            <View style={styles.row}>
              <Icon name="pin" color={colors.secondary} />
              <AppText variant="body" color={colors.textSecondary} style={{ flex: 1 }}>
                {[event.location.name, event.location.city].filter(Boolean).join(', ')}
              </AppText>
            </View>
            <View style={styles.row}>
              <Icon name="ticket" color={colors.secondary} />
              <AppText variant="body" color={colors.textSecondary}>
                {priceLabel(event)}
                {event.maxCapacity ? ` · Cupo ${event.maxCapacity}` : ''}
              </AppText>
            </View>
          </View>

          {/* Social proof */}
          <View style={[styles.proof, { backgroundColor: colors.surfaceContainer }]}>
            <View style={styles.avatars}>
              {attendees.map((a, i) => (
                <View key={a.userId} style={{ marginLeft: i ? -12 : 0, borderRadius: 22, borderWidth: 2, borderColor: colors.surfaceContainer }}>
                  <Avatar uri={a.user.avatarUrl} name={a.user.username} size={38} />
                </View>
              ))}
            </View>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {count === 0 ? 'Sé el primero en ir' : `${count} ${count === 1 ? 'persona va' : 'personas van'} 🔥`}
            </AppText>
          </View>

          {/* CTAs */}
          {event.status !== 'cancelled' && (
            <View style={styles.row}>
              {ended ? (
                <GhostButton title={isGoing ? 'Asististe' : 'Finalizado'} icon={isGoing ? 'check' : undefined} disabled style={{ flex: 1 }} />
              ) : isGoing ? (
                <GhostButton title="Voy ✓ · Cancelar" loading={busy === 'join'} onPress={toggleGoing} style={{ flex: 1 }} />
              ) : (
                <GradientButton title="Voy" icon="check" loading={busy === 'join'} onPress={toggleGoing} style={{ flex: 1 }} />
              )}
              <IconButton icon={isSaved ? 'bookmarkFill' : 'bookmark'} label={isSaved ? 'Quitar de guardados' : 'Guardar'} active={isSaved} onPress={toggleSaved} size={56} color={isSaved ? undefined : colors.secondary} />
              <IconButton icon="share" label="Compartir" onPress={share} size={56} />
            </View>
          )}
          {actionError && (
            <AppText variant="caption" color={colors.error}>
              {actionError}
            </AppText>
          )}

          {event.description ? (
            <View style={{ gap: Spacing.two }}>
              <AppText variant="heading">Acerca del evento</AppText>
              <AppText variant="body" color={colors.textSecondary} style={{ fontSize: 16, lineHeight: 24 }}>
                {event.description}
              </AppText>
              {event.tags.length > 0 && (
                <AppText variant="label" color={colors.secondary}>
                  {event.tags.map((t) => `#${t.tag}`).join('  ')}
                </AppText>
              )}
            </View>
          ) : null}

          {/* Photos */}
          <View style={{ gap: Spacing.three }}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <AppText variant="heading">Fotos del evento</AppText>
              {isLive(event) && <AppText variant="label" color={colors.secondary}>En vivo</AppText>}
            </View>
            {photos.length === 0 ? (
              <AppText variant="caption">Aún no hay fotos. Las fotos subidas durante el evento aparecerán aquí.</AppText>
            ) : (
              <FlatList
                horizontal
                data={photos}
                keyExtractor={(p) => p.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.three }}
                renderItem={({ item }) => (
                  <Image source={{ uri: item.thumbnailUrl ?? item.url }} style={styles.photo} contentFit="cover" />
                )}
              />
            )}
          </View>

          {/* Location */}
          <View style={{ gap: Spacing.three }}>
            <AppText variant="heading">Ubicación</AppText>
            <View style={styles.mapBox}>
              <EventMap
                center={{ lat: event.location.latitude, lng: event.location.longitude }}
                pins={[{ id: event.id, latitude: event.location.latitude, longitude: event.location.longitude, category: event.category, status: event.status, currentAttendees: 0, title: event.title }]}
                radiusKm={0.8}
                interactive={false}
              />
            </View>
            <View style={[styles.venue, { backgroundColor: colors.surfaceHigh }]}>
              <AppText variant="bodyStrong">{event.location.name}</AppText>
              {event.location.address && <AppText variant="caption">{event.location.address}</AppText>}
            </View>
          </View>

          {/* Organizer */}
          <View style={[styles.proof, { backgroundColor: colors.surfaceContainer }]}>
            <Avatar uri={event.organizer.avatarUrl} name={event.organizer.username} size={44} />
            <View style={{ flex: 1 }}>
              <AppText variant="label">Organiza</AppText>
              <AppText variant="bodyStrong">@{event.organizer.username}</AppText>
            </View>
          </View>
          {isOrganizer && event.status !== 'cancelled' && !ended && (
            <GhostButton title="Cancelar evento" icon="close" loading={busy === 'cancel'} onPress={cancelEvent} />
          )}

          {similar.length > 0 && (
            <View style={{ gap: Spacing.three }}>
              <AppText variant="heading">Eventos similares cerca</AppText>
              <FlatList
                horizontal
                data={similar}
                keyExtractor={(e) => e.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.three }}
                renderItem={({ item }) => <CarouselEventCard event={item} />}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.floatingBack, { top: insets.top + Spacing.two }]}>
        <BackButton />
        <Pressable onPress={share} hitSlop={8} accessibilityLabel="Compartir" style={[styles.circle, { backgroundColor: colors.surfaceHighest }]}>
          <Icon name="share" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + Spacing.two }}>
      <View style={{ paddingHorizontal: Spacing.four }}>
        <BackButton />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.four, marginTop: -48, gap: Spacing.five, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 4 },
  proof: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md },
  avatars: { flexDirection: 'row' },
  photo: { width: 160, height: 220, borderRadius: Radius.md },
  mapBox: { height: 190, borderRadius: Radius.md, overflow: 'hidden' },
  venue: { padding: Spacing.three, borderRadius: Radius.md - 8, gap: 2 },
  floatingBack: { position: 'absolute', left: Spacing.four, right: Spacing.four, flexDirection: 'row', justifyContent: 'space-between' },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
