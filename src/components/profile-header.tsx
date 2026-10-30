import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { compactNumber } from '@/lib/format';
import type { User, UserStats } from '@/lib/types';

import { Avatar } from './event-cards';
import { Icon, type IconName } from './icon';
import { AppText, glow } from './ui';

type ProfileUser = Pick<User, 'id' | 'username' | 'avatarUrl' | 'bio' | 'accountType' | 'isVerified'>;

/** Gradient-ringed avatar, name, bio and follower counters (own and public profiles). */
export function ProfileHero({ user, stats, emptyBio }: { user: ProfileUser; stats?: UserStats; emptyBio: string }) {
  const { colors } = useAppTheme();
  const openFollows = (kind: 'followers' | 'following') =>
    router.push({ pathname: '/follows', params: { userId: user.id, kind } });

  return (
    <View style={styles.hero}>
      <View style={glow(colors.primary, 0.35, 40)}>
        <LinearGradient colors={[colors.primary, colors.secondary, colors.primary]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.ring}>
          <View style={[styles.ringInner, { borderColor: colors.background }]}>
            <Avatar uri={user.avatarUrl} name={user.username} size={112} />
          </View>
        </LinearGradient>
      </View>
      <View style={{ alignItems: 'center', gap: Spacing.two }}>
        <View style={styles.nameRow}>
          <AppText variant="title">@{user.username}</AppText>
          {user.isVerified && <Icon name="check" size={20} color={colors.secondary} />}
        </View>
        {user.accountType === 'business' && (
          <AppText variant="label" color={colors.tertiary}>
            Cuenta de negocio
          </AppText>
        )}
        <AppText variant="body" color={colors.textSecondary} style={{ textAlign: 'center', maxWidth: 300 }}>
          {user.bio || emptyBio}
        </AppText>
      </View>
      <View style={styles.follow}>
        <Counter value={stats?.followers} label="Seguidores" color={colors.primary} onPress={() => openFollows('followers')} />
        <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
        <Counter value={stats?.following} label="Siguiendo" color={colors.secondary} onPress={() => openFollows('following')} />
        <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
        <Counter value={stats?.eventsCreated} label="Eventos" color={colors.tertiary} />
      </View>
    </View>
  );
}

/** Big number + label; tappable only when `onPress` is given (followers/following lists). */
function Counter({ value, label, color, onPress }: { value?: number; label: string; color: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={8}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${value ?? 0} ${label}`}
      style={{ alignItems: 'center' }}>
      <AppText variant="heading" color={color}>
        {value === undefined ? '–' : compactNumber(value)}
      </AppText>
      <AppText variant="label" style={{ fontSize: 10 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function StatCard({ label, value, icon, color }: { label: string; value?: number; icon: IconName; color: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surfaceContainer }]}>
      <View style={styles.statIcon}>
        <Icon name={icon} size={72} color={colors.surfaceHighest} />
      </View>
      <AppText variant="label" style={{ fontSize: 10 }}>
        {label}
      </AppText>
      <AppText variant="display" color={color}>
        {value === undefined ? '–' : compactNumber(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.four },
  ring: { width: 128, height: 128, borderRadius: 64, padding: 4 },
  ringInner: { flex: 1, borderRadius: 60, borderWidth: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  follow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five },
  divider: { width: 1, height: 32, opacity: 0.4 },
  statCard: { flex: 1, height: 128, borderRadius: Radius.md, padding: Spacing.four - 4, justifyContent: 'space-between', overflow: 'hidden' },
  statIcon: { position: 'absolute', right: -12, bottom: -12 },
});
