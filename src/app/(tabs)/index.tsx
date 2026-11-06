import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityTile } from '@/components/community-cards';
import { RowEventCard } from '@/components/event-cards';
import { Icon } from '@/components/icon';
import { HeaderActions } from '@/components/top-bar';
import { AppText, Chip, EmptyState, ErrorState, hexToRgba, LoadingState, SectionHeader } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { useQuery } from '@/hooks/use-query';
import { communitiesApi, usersApi, type FeedSource } from '@/lib/endpoints';
import { groupByDay, hasEnded } from '@/lib/format';
import type { Community, FeedEvent } from '@/lib/types';

const SOURCES: { value: FeedSource; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'communities', label: 'Comunidades' },
  { value: 'people', label: 'Personas' },
  { value: 'business', label: 'Establecimientos' },
];

const EMPTY_FEED: Record<FeedSource, string> = {
  all: 'Únete a comunidades o sigue a personas y establecimientos para ver aquí sus próximos eventos.',
  communities: 'Las comunidades a las que te unas publicarán aquí sus eventos.',
  people: 'Sigue a otras personas para ver aquí los eventos que organizan.',
  business: 'Sigue a establecimientos para ver aquí sus próximos eventos.',
};

/** Who an event in the feed comes from: the community, or the person / business that organizes it. */
function bylineOf(e: FeedEvent) {
  if (e.community) return `Por ${e.community.name}`;
  return e.organizer.accountType === 'business' ? `Por ${e.organizer.username}` : `Por @${e.organizer.username}`;
}

/**
 * Landing tab: your communities, a shortcut to create one, and upcoming events from
 * communities you joined and people / businesses you follow.
 */
export default function Home() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState<FeedSource>('all');

  const communities = useQuery(() => communitiesApi.mine(), []);
  const feed = useQuery(() => usersApi.feed(source), [source]);
  const events = (feed.data ?? []).filter((e) => !hasEnded(e));

  const refresh = () => {
    communities.refresh();
    feed.refresh();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.three }]}
        refreshControl={
          <RefreshControl refreshing={communities.refreshing || feed.refreshing} onRefresh={refresh} tintColor={colors.secondary} />
        }>
        <View style={styles.titleRow}>
          <AppText variant="display" style={{ flex: 1 }}>
            Inicio
          </AppText>
          <HeaderActions showAvatar />
        </View>

        <View style={{ gap: Spacing.three }}>
          <SectionHeader
            title="Tus comunidades"
            eyebrow={communities.data?.length ? String(communities.data.length) : undefined}
            eyebrowColor={colors.primary}
            action="Ver todas"
            onAction={() => router.push('/communities')}
          />
          {communities.loading ? null : communities.data?.length ? (
            <CommunityGrid communities={communities.data} />
          ) : (
            <Pressable onPress={() => router.push('/communities')} style={[styles.discover, { backgroundColor: colors.surfaceContainer }]}>
              <Icon name="search" size={20} color={colors.primary} />
              <AppText variant="body" color={colors.textSecondary} style={{ flex: 1 }}>
                Aún no estás en ninguna comunidad. Descubre comunidades de tu ciudad.
              </AppText>
              <Icon name="chevronRight" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => router.push('/community/new')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.createCard, { opacity: pressed ? 0.9 : 1 }]}>
          <LinearGradient
            colors={[hexToRgba(colors.primary, 0.35), hexToRgba(colors.primaryDeep, 0.15)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: Radius.md, borderWidth: 1, borderColor: hexToRgba(colors.primary, 0.35) }]}
          />
          <Icon name="community" size={32} color={colors.text} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" style={{ fontSize: 17 }}>
              Crear una nueva comunidad
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Organiza tus propios eventos
            </AppText>
          </View>
          <View style={[styles.arrow, { backgroundColor: hexToRgba(colors.text, 0.12) }]}>
            <Icon name="forward" size={20} color={colors.text} />
          </View>
        </Pressable>

        <View style={{ gap: Spacing.three }}>
          <SectionHeader title="Eventos" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsBleed}>
            {SOURCES.map((s) => (
              <Chip key={s.value} label={s.label} active={source === s.value} onPress={() => setSource(s.value)} />
            ))}
          </ScrollView>

          {feed.loading ? (
            <LoadingState />
          ) : feed.error && !feed.data ? (
            <ErrorState error={feed.error} onRetry={feed.refresh} />
          ) : events.length === 0 ? (
            <EmptyState
              icon="community"
              title="Nada por aquí todavía"
              message={EMPTY_FEED[source]}
              action="Descubrir comunidades"
              onAction={() => router.push('/communities')}
            />
          ) : (
            groupByDay(events).map(([day, list]) => (
              <View key={day} style={{ gap: Spacing.three }}>
                <AppText variant="label" color={colors.textMuted}>
                  {day}
                </AppText>
                {list.map((e) => (
                  <RowEventCard key={e.id} event={e} byline={bylineOf(e)} />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** Two rows that scroll sideways, like the reference: columns of two communities each. */
function CommunityGrid({ communities }: { communities: Community[] }) {
  const { width } = useWindowDimensions();
  const columnWidth = Math.min(MaxContentWidth, width) * 0.62;
  const columns: Community[][] = [];
  for (let i = 0; i < communities.length; i += 2) columns.push(communities.slice(i, i + 2));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grid} style={styles.chipsBleed}>
      {columns.map((col) => (
        <View key={col[0].id} style={{ gap: Spacing.three }}>
          {col.map((c) => (
            <CommunityTile key={c.id} community={c} width={columnWidth} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: TabBarHeight + Spacing.five,
    gap: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  // Horizontal lists run edge to edge while their first item lines up with the content.
  chipsBleed: { marginHorizontal: -Spacing.four },
  chips: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  grid: { paddingHorizontal: Spacing.four, gap: Spacing.four },
  discover: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.md },
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
