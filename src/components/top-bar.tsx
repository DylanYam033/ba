import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuth } from '@/ctx/auth';
import { useNotifications } from '@/ctx/notifications';
import { useAppTheme } from '@/ctx/theme';

import { Avatar } from './event-cards';
import { Icon } from './icon';
import { AppText, BrandMark, glow } from './ui';

/** Bell with the unread-notifications badge; opens the notifications screen. */
export function NotificationsBell() {
  const { colors } = useAppTheme();
  const { unreadCount } = useNotifications();
  const label = unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones';
  return (
    <Pressable onPress={() => router.push('/notifications')} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name="bell" size={24} color={colors.text} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.live, borderColor: colors.overlay }]}>
          <AppText variant="label" color="#fff" style={{ fontSize: 9, lineHeight: 12 }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

/** Glass app bar from the prototype: wordmark centered, bell + avatar on the right. */
export function TopBar({ left, title, right }: { left?: ReactNode; title?: string; right?: ReactNode }) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + Spacing.two, backgroundColor: colors.overlay }, glow(colors.brandStart, 0.12)]}>
      <View style={styles.side}>{left}</View>
      {title ? <AppText variant="heading">{title}</AppText> : <BrandMark />}
      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        {right ??
          (user && (
            <View style={styles.actions}>
              <NotificationsBell />
              <Pressable onPress={() => router.navigate('/profile')} accessibilityLabel="Perfil">
                <View style={{ borderRadius: 20, borderWidth: 2, borderColor: colors.primaryContainer }}>
                  <Avatar uri={user.avatarUrl} name={user.username} size={36} />
                </View>
              </Pressable>
            </View>
          ))}
      </View>
    </View>
  );
}

export function BackButton({ icon = 'back' }: { icon?: 'back' | 'close' }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel="Volver"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={8}
      style={[styles.back, { backgroundColor: colors.surfaceHighest }]}>
      <Icon name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three - 4,
    zIndex: 10,
  },
  side: { width: 88 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
