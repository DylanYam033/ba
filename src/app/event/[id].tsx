import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityAvatar } from '@/components/community-cards';
import { Avatar, CarouselEventCard, CategoryBadge } from '@/components/event-cards';
import { EventCover } from '@/components/event-cover';
import { Icon } from '@/components/icon';
import { EventMap } from '@/components/map/event-map';
import { BackButton } from '@/components/top-bar';
import { AppText, ErrorState, GhostButton, GradientButton, IconButton, LiveBadge, LoadingState, Pill } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { useLiveEvent } from '@/hooks/use-live-event';
import { useQuery } from '@/hooks/use-query';
import { mediaSource } from '@/lib/api';
import { eventsApi, photosApi, usersApi } from '@/lib/endpoints';
import { formatLongRange, hasEnded, isLive, priceLabel } from '@/lib/format';
import { pickImage } from '@/lib/pick-image';
import type { Photo } from '@/lib/types';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const user = useCurrentUser();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<'join' | 'save' | 'cancel' | 'photo' | null>(null);
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

  const addPhoto = (photo: Photo) =>
    query.setData((d) => d && { ...d, photos: d.photos.some((p) => p.id === photo.id) ? d.photos : [photo, ...d.photos] });

  const liveCount = useLiveEvent(id, query.data?.event.currentAttendees, {
    onPhoto: addPhoto,
    onStatus: (status) => query.setData((d) => d && { ...d, event: { ...d.event, status } }),
  });

  if (query.loading) return <Shell><LoadingState /></Shell>;
  if (query.error || !query.data) return <Shell><ErrorState error={query.error ?? new Error('Evento no encontrado')} onRetry={query.refresh} /></Shell>;

  const { event, attendees, photos, isGoing, isSaved, similar } = query.data;
  const isOrganizer = event.organizerId === user.id;
  const ended = hasEnded(event);
  const count = liveCount ?? event.currentAttendees;
  // Only the organizer adds photos (and the cover).
  const canUpload = isOrganizer && event.status !== 'cancelled';

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

  const uploadPhoto = async () => {
    setActionError(null);
    const file = await pickImage();
    if (!file) return;
    setBusy('photo');
    try {
      addPhoto(await photosApi.upload(id, file));
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openPhoto = (index: number) => router.push({ pathname: '/photo-viewer', params: { eventId: id, index: String(index) } });
  const openUser = (userId: string) => router.push({ pathname: '/user/[id]', params: { id: userId } });

  const share = () =>
    Share.share({ message: `${event.title} — ${formatLongRange(event.startAt, event.endAt)} en ${event.location.name}. Míralo en BIBING.` });

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
        <EventCover uri={event.coverUrl} category={event.category} style={{ height: 380 }} iconSize={220} />

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
                <Pressable
                  key={a.userId}
                  onPress={() => openUser(a.userId)}
                  accessibilityLabel={`Ver perfil de @${a.user.username}`}
                  style={{ marginLeft: i ? -12 : 0, borderRadius: 22, borderWidth: 2, borderColor: colors.surfaceContainer }}>
                  <Avatar uri={a.user.avatarUrl} name={a.user.username} size={38} />
                </Pressable>
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
              {canUpload ? (
                <Pressable onPress={uploadPhoto} disabled={busy === 'photo'} accessibilityRole="button" accessibilityLabel="Subir foto">
                  <Pill>
                    {busy === 'photo' ? (
                      <ActivityIndicator size="small" color={colors.secondary} />
                    ) : (
                      <Icon name="camera" size={14} color={colors.secondary} />
                    )}
                    <AppText variant="label" color={colors.secondary}>
                      {busy === 'photo' ? 'Subiendo…' : 'Subir foto'}
                    </AppText>
                  </Pill>
                </Pressable>
              ) : (
                isLive(event) && <AppText variant="label" color={colors.secondary}>En vivo</AppText>
              )}
            </View>
            {photos.length === 0 ? (
              <AppText variant="caption">
                {canUpload ? 'Comparte las primeras fotos del plan.' : 'Aún no hay fotos del evento.'}
              </AppText>
            ) : (
              <FlatList
                horizontal
                data={photos}
                keyExtractor={(p) => p.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.three }}
                renderItem={({ item, index }) => (
                  <Pressable onPress={() => openPhoto(index)} accessibilityLabel={`Foto de @${item.uploader.username}`}>
                    <Image source={mediaSource(item.thumbnailUrl ?? item.url)} style={styles.photo} contentFit="cover" />
                    {item.likesCount > 0 && (
                      <View style={styles.photoLikes}>
                        <Icon name="heartFill" size={12} color="#fff" />
                        <AppText variant="label" color="#fff" style={{ fontSize: 10 }}>
                          {item.likesCount}
                        </AppText>
                      </View>
                    )}
                  </Pressable>
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
                pins={[{ id: event.id, latitude: event.location.latitude, longitude: event.location.longitude, category: event.category, status: event.status, currentAttendees: 0, title: event.title, startAt: event.startAt, endAt: event.endAt }]}
                radiusKm={0.8}
                interactive={false}
              />
            </View>
            <View style={[styles.venue, { backgroundColor: colors.surfaceHigh }]}>
              <AppText variant="bodyStrong">{event.location.name}</AppText>
              {event.location.address && <AppText variant="caption">{event.location.address}</AppText>}
            </View>
          </View>

          {/* Community (when published on its behalf) + organizer */}
          {event.community && (
            <Pressable
              onPress={() => router.push({ pathname: '/community/[id]', params: { id: event.community!.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Ver comunidad ${event.community.name}`}
              style={[styles.proof, { backgroundColor: colors.surfaceContainer }]}>
              <CommunityAvatar community={event.community} size={44} />
              <View style={{ flex: 1 }}>
                <AppText variant="label">Comunidad</AppText>
                <AppText variant="bodyStrong">{event.community.name}</AppText>
              </View>
              <Icon name="chevronRight" size={20} color={colors.textMuted} />
            </Pressable>
          )}
          <Pressable
            onPress={() => openUser(event.organizer.id)}
            accessibilityRole="button"
            accessibilityLabel={`Ver perfil de @${event.organizer.username}`}
            style={[styles.proof, { backgroundColor: colors.surfaceContainer }]}>
            <Avatar uri={event.organizer.avatarUrl} name={event.organizer.username} size={44} />
            <View style={{ flex: 1 }}>
              <AppText variant="label">Organiza</AppText>
              <AppText variant="bodyStrong">@{event.organizer.username}</AppText>
            </View>
            <Icon name="chevronRight" size={20} color={colors.textMuted} />
          </Pressable>
          {isOrganizer && event.status !== 'cancelled' && !ended && (
            <>
              <GradientButton title="Editar evento" icon="edit" onPress={() => router.push({ pathname: '/edit-event/[id]', params: { id } })} />
              <GhostButton title="Cancelar evento" icon="close" loading={busy === 'cancel'} onPress={cancelEvent} />
            </>
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
  photoLikes: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  mapBox: { height: 190, borderRadius: Radius.md, overflow: 'hidden' },
  venue: { padding: Spacing.three, borderRadius: Radius.md - 8, gap: 2 },
  floatingBack: { position: 'absolute', left: Spacing.four, right: Spacing.four, flexDirection: 'row', justifyContent: 'space-between' },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
