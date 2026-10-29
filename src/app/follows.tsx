import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/event-cards';
import { Icon } from '@/components/icon';
import { BackButton, TopBar } from '@/components/top-bar';
import { AppText, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { usePaginated } from '@/hooks/use-paginated';
import { usersApi } from '@/lib/endpoints';

type Kind = 'followers' | 'following';

/** Followers / following of any user: /follows?userId=…&kind=followers|following */
export default function Follows() {
  const { userId, kind = 'followers' } = useLocalSearchParams<{ userId: string; kind?: Kind }>();
  const { colors } = useAppTheme();
  const list = usePaginated(
    (page) => (kind === 'following' ? usersApi.following(userId, page) : usersApi.followers(userId, page)),
    [userId, kind],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title={kind === 'following' ? 'Siguiendo' : 'Seguidores'} left={<BackButton />} right={<View />} />
      {list.loading ? (
        <LoadingState />
      ) : list.error && list.items.length === 0 ? (
        <ErrorState error={list.error} onRetry={list.refresh} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.secondary} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState
              icon="person"
              title={kind === 'following' ? 'No sigue a nadie aún' : 'Sin seguidores aún'}
              message="Cuando haya personas aquí, las verás en esta lista."
            />
          }
          ListFooterComponent={
            list.loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.four }} /> : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil de @${item.username}`}
              style={({ pressed }) => [styles.row, { backgroundColor: colors.surfaceContainer, opacity: pressed ? 0.8 : 1 }]}>
              <Avatar uri={item.avatarUrl} name={item.username} size={44} />
              <AppText variant="bodyStrong" style={{ flex: 1 }}>
                @{item.username}
              </AppText>
              <Icon name="chevronRight" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.two, flexGrow: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md },
});
