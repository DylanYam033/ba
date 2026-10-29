import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { BackButton, TopBar } from '@/components/top-bar';
import { AppText, EmptyState, ErrorState, hexToRgba, LoadingState } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useNotifications } from '@/ctx/notifications';
import { useAppTheme } from '@/ctx/theme';
import { usePaginated } from '@/hooks/use-paginated';
import { notificationsApi } from '@/lib/endpoints';
import { formatRelative } from '@/lib/format';
import { describeNotification, notificationTarget } from '@/lib/notifications';
import type { AppNotification } from '@/lib/types';

export default function Notifications() {
  const { colors } = useAppTheme();
  const { unreadCount, setUnreadCount, subscribe } = useNotifications();
  const list = usePaginated((page) => notificationsApi.list(page), []);
  const { setItems } = list;

  // Notifications pushed while the screen is open go straight to the top.
  useEffect(() => subscribe((n) => setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)])), [subscribe, setItems]);

  const markLocal = (pred: (n: AppNotification) => boolean) =>
    setItems((prev) => prev.map((n) => (pred(n) ? { ...n, isRead: true } : n)));

  const open = (n: AppNotification) => {
    if (!n.isRead) {
      markLocal((x) => x.id === n.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      notificationsApi.markRead(n.id).catch(() => undefined);
    }
    const target = notificationTarget(n);
    if (target) router.push(target);
  };

  const markAll = () => {
    markLocal(() => true);
    setUnreadCount(() => 0);
    notificationsApi.markAllRead().catch(() => list.refresh());
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar
        title="Notificaciones"
        left={<BackButton />}
        right={
          unreadCount > 0 ? (
            <Pressable onPress={markAll} hitSlop={8} accessibilityRole="button" accessibilityLabel="Marcar todas como leídas">
              <AppText variant="label" color={colors.primary}>
                Leer todo
              </AppText>
            </Pressable>
          ) : (
            <View />
          )
        }
      />
      {list.loading ? (
        <LoadingState />
      ) : list.error && list.items.length === 0 ? (
        <ErrorState error={list.error} onRetry={list.refresh} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.secondary} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState icon="bell" title="Todo al día" message="Aquí verás cuando alguien te siga, suba fotos a tus eventos o un plan empiece." />
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.four }} /> : undefined}
          renderItem={({ item }) => <NotificationRow notification={item} onPress={() => open(item)} />}
        />
      )}
    </View>
  );
}

function NotificationRow({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const { colors } = useAppTheme();
  const copy = describeNotification(notification);
  const unread = !notification.isRead;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Sin leer. ' : ''}${copy.title}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: unread ? hexToRgba(colors.primaryContainer, 0.18) : colors.surfaceContainer, opacity: pressed ? 0.8 : 1 },
      ]}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceHighest }]}>
        <Icon name={copy.icon} size={20} color={unread ? colors.primary : colors.textSecondary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {copy.title}
        </AppText>
        {copy.body ? (
          <AppText variant="caption" numberOfLines={2}>
            {copy.body}
          </AppText>
        ) : null}
        <AppText variant="label" color={colors.textMuted} style={{ fontSize: 10, marginTop: 2 }}>
          {formatRelative(notification.createdAt)}
        </AppText>
      </View>
      {unread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
