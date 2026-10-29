import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/event-cards';
import { Icon } from '@/components/icon';
import { AppText, ErrorState, LoadingState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { useQuery } from '@/hooks/use-query';
import { mediaSource } from '@/lib/api';
import { eventsApi, photosApi } from '@/lib/endpoints';
import { formatRelative } from '@/lib/format';
import type { Photo } from '@/lib/types';

/** Full-screen, swipeable event photos: /photo-viewer?eventId=…&index=… */
export default function PhotoViewer() {
  const { eventId, index = '0' } = useLocalSearchParams<{ eventId: string; index?: string }>();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const me = useCurrentUser();
  const [current, setCurrent] = useState(Number(index));
  const [error, setError] = useState<string | null>(null);

  const query = useQuery(() => eventsApi.photos(eventId).then((r) => r.data), [eventId]);
  const photos = query.data ?? [];
  const photo = photos[Math.min(current, photos.length - 1)];

  const patch = (id: string, fn: (p: Photo) => Photo | null) =>
    query.setData((list) => list?.flatMap((p) => (p.id === id ? (fn(p) ?? []) : [p])));

  const toggleLike = async (p: Photo) => {
    const liked = p.likedByMe;
    const flip = (on: boolean) => patch(p.id, (x) => ({ ...x, likedByMe: on, likesCount: Math.max(0, x.likesCount + (on ? 1 : -1)) }));
    setError(null);
    flip(!liked);
    try {
      await (liked ? photosApi.unlike(p.id) : photosApi.like(p.id));
    } catch (e) {
      flip(liked);
      setError((e as Error).message);
    }
  };

  const remove = (p: Photo) => {
    const doRemove = async () => {
      try {
        await photosApi.remove(p.id);
        if (photos.length === 1) return router.back();
        patch(p.id, () => null);
        setCurrent((c) => Math.max(0, Math.min(c, photos.length - 2)));
      } catch (e) {
        setError((e as Error).message);
      }
    };
    if (Platform.OS === 'web') return doRemove();
    Alert.alert('Eliminar foto', 'La foto dejará de verse en el evento.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: doRemove },
    ]);
  };

  return (
    <View style={styles.root}>
      {query.loading ? (
        <LoadingState />
      ) : query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={query.refresh} />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(Number(index), Math.max(0, photos.length - 1))}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, flex: 1 }}>
              <Image source={mediaSource(item.url)} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
            </View>
          )}
        />
      )}

      <View style={[styles.top, { top: insets.top + Spacing.two }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Cerrar" style={styles.circle}>
          <Icon name="close" size={20} color="#fff" />
        </Pressable>
        {photos.length > 1 && (
          <AppText variant="label" color="#fff">
            {current + 1} / {photos.length}
          </AppText>
        )}
      </View>

      {photo && (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.row}>
            <Pressable
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: photo.uploader.id } })}
              accessibilityLabel={`Ver perfil de @${photo.uploader.username}`}
              style={[styles.row, { flex: 1 }]}>
              <Avatar uri={photo.uploader.avatarUrl} name={photo.uploader.username} size={36} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" color="#fff">
                  @{photo.uploader.username}
                </AppText>
                <AppText variant="label" color="rgba(255,255,255,0.7)" style={{ fontSize: 10 }}>
                  {formatRelative(photo.uploadedAt)}
                </AppText>
              </View>
            </Pressable>
            {photo.uploaderId === me.id && (
              <Pressable onPress={() => remove(photo)} hitSlop={8} accessibilityLabel="Eliminar foto" style={styles.circle}>
                <Icon name="trash" size={20} color="#fff" />
              </Pressable>
            )}
            <Pressable
              onPress={() => toggleLike(photo)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ selected: photo.likedByMe }}
              accessibilityLabel={photo.likedByMe ? 'Quitar me gusta' : 'Me gusta'}
              style={styles.like}>
              <Icon name={photo.likedByMe ? 'heartFill' : 'heart'} size={24} color={photo.likedByMe ? colors.live : '#fff'} />
              <AppText variant="bodyStrong" color="#fff">
                {photo.likesCount}
              </AppText>
            </Pressable>
          </View>
          {photo.caption ? (
            <AppText variant="body" color="#fff">
              {photo.caption}
            </AppText>
          ) : null}
          {error && (
            <AppText variant="caption" color={colors.error}>
              {error}
            </AppText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', left: Spacing.four, right: Spacing.four, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  like: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.two, paddingVertical: 6 },
});
