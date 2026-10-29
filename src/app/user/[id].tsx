import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { RowEventCard } from '@/components/event-cards';
import { ProfileHero, StatCard } from '@/components/profile-header';
import { BackButton, TopBar } from '@/components/top-bar';
import { AppText, EmptyState, ErrorState, GhostButton, GradientButton, LoadingState, SectionHeader } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { useQuery } from '@/hooks/use-query';
import { usersApi } from '@/lib/endpoints';
import { hasEnded } from '@/lib/format';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const me = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isMe = id === me.id;

  const query = useQuery(
    isMe
      ? null
      : async () => {
          const [profile, events] = await Promise.all([usersApi.get(id), usersApi.events(id)]);
          return { profile, events };
        },
    [id],
  );

  if (isMe) return <Redirect href="/profile" />;

  if (query.loading) return <Shell><LoadingState /></Shell>;
  if (query.error || !query.data) {
    return <Shell><ErrorState error={query.error ?? new Error('Usuario no encontrado')} onRetry={query.refresh} /></Shell>;
  }

  const { profile, events } = query.data;
  const upcoming = events.filter((e) => !hasEnded(e)).reverse();
  const past = events.filter(hasEnded).slice(0, 5);

  const toggleFollow = async () => {
    const following = profile.isFollowing;
    // Optimistic: flip the button and the counter, roll back on failure.
    const patch = (isFollowing: boolean, delta: number) =>
      query.setData(
        (d) =>
          d && {
            ...d,
            profile: { ...d.profile, isFollowing, stats: { ...d.profile.stats, followers: d.profile.stats.followers + delta } },
          },
      );
    setBusy(true);
    setActionError(null);
    patch(!following, following ? -1 : 1);
    try {
      await (following ? usersApi.unfollow(id) : usersApi.follow(id));
    } catch (e) {
      patch(following, following ? 1 : -1);
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} tintColor={colors.secondary} />}>
        <ProfileHero user={profile} stats={profile.stats} emptyBio="Sin bio todavía." />

        {profile.isFollowing ? (
          <GhostButton title="Siguiendo" icon="check" loading={busy} onPress={toggleFollow} />
        ) : (
          <GradientButton title="Seguir" icon="personAdd" loading={busy} onPress={toggleFollow} />
        )}
        {actionError && (
          <AppText variant="caption" color={colors.error}>
            {actionError}
          </AppText>
        )}

        <View style={styles.statGrid}>
          <StatCard label="Eventos asistidos" value={profile.stats.eventsAttended} icon="ticket" color={colors.primary} />
          <StatCard label="Fotos compartidas" value={profile.stats.photosShared} icon="photos" color={colors.secondary} />
        </View>

        {upcoming.length > 0 && (
          <View style={{ gap: Spacing.three }}>
            <SectionHeader eyebrow="Organiza" title="Próximos eventos" />
            {upcoming.map((e) => (
              <RowEventCard key={e.id} event={e} />
            ))}
          </View>
        )}
        {past.length > 0 && (
          <View style={{ gap: Spacing.three }}>
            <SectionHeader title="Eventos pasados" />
            {past.map((e) => (
              <RowEventCard key={e.id} event={e} dimmed />
            ))}
          </View>
        )}
        {events.length === 0 && (
          <EmptyState icon="events" title="Sin eventos publicados" message={`@${profile.username} aún no ha organizado eventos.`} />
        )}
      </ScrollView>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar left={<BackButton />} right={<View />} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.five, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  statGrid: { flexDirection: 'row', gap: Spacing.three },
});
