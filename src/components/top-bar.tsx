import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuth } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';

import { Avatar } from './event-cards';
import { Icon } from './icon';
import { AppText, BrandMark, glow } from './ui';

/** Glass app bar from the prototype: wordmark centered, avatar on the right. */
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
            <Pressable onPress={() => router.navigate('/profile')} accessibilityLabel="Perfil">
              <View style={{ borderRadius: 20, borderWidth: 2, borderColor: colors.primaryContainer }}>
                <Avatar uri={user.avatarUrl} name={user.username} size={36} />
              </View>
            </Pressable>
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
  side: { width: 72 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
