import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { OrganizedEvents } from '@/components/organized-events';
import { ProfileHero, StatCard } from '@/components/profile-header';
import { BackButton, TopBar } from '@/components/top-bar';
import { AppText, ErrorState, GhostButton, GradientButton, LoadingState, SectionHeader } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { useOrganizedEvents } from '@/hooks/use-organized-events';
import { useQuery } from '@/hooks/use-query';
import { usersApi } from '@/lib/endpoints';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const me = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isMe = id === me.id;

  const query = useQuery(isMe ? null : async () => ({ profile: await usersApi.get(id) }), [id]);
  const events = useOrganizedEvents(id, !isMe);
  const refresh = async () => {
    await Promise.all([query.refresh(), events.refresh()]);
  };

  if (isMe) return <Redirect href="/profile" />;

  if (query.loading) return <Shell><LoadingState /></Shell>;
  if (query.error || !query.data) {
    return <Shell><ErrorState error={query.error ?? new Error('Usuario no encontrado')} onRetry={query.refresh} /></Shell>;
  }

  const { profile } = query.data;

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
        refreshControl={<RefreshControl refreshing={query.refreshing || events.refreshing} onRefresh={refresh} tintColor={colors.secondary} />}>
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

        <View style={{ gap: Spacing.three }}>
          <SectionHeader title="Eventos creados" />
          {!events.loading && (
            <OrganizedEvents
              events={events.events}
              hasMore={events.hasMore}
              loadingMore={events.loadingMore}
              onLoadMore={events.loadMore}
              moreError={events.moreError}
              emptyTitle="Sin eventos publicados"
              emptyMessage={`@${profile.username} aún no ha organizado eventos.`}
            />
          )}
        </View>
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
