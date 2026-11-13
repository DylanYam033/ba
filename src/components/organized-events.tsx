import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { hasEnded, isLive } from '@/lib/format';
import type { EventWithLocation } from '@/lib/types';

import { RowEventCard } from './event-cards';
import { Icon } from './icon';
import { AppText, EmptyState, GhostButton, SectionHeader } from './ui';

/** Past events shown before the list gets long; the API returns up to 30 in total. */
const PAST_LIMIT = 10;

/**
 * Events a user organizes, split into "En curso", "Próximos" (soonest first) and
 * "Pasados" (latest first, dimmed). Shared by the own and public profiles.
 */
export function OrganizedEvents({
  events,
  emptyTitle,
  emptyMessage,
  emptyAction,
  onEmptyAction,
  editable,
  hasMore,
  loadingMore,
  onLoadMore,
  moreError,
}: {
  events: EventWithLocation[];
  /** Own profile: show an "Editar" shortcut on live and upcoming events. */
  editable?: boolean;
  /** Paginated lists: show "Ver más" while the API has more. */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  moreError?: string | null;
  emptyTitle: string;
  emptyMessage: string;
  emptyAction?: string;
  onEmptyAction?: () => void;
}) {
  const { colors } = useAppTheme();

  if (events.length === 0) {
    return <EmptyState icon="events" title={emptyTitle} message={emptyMessage} action={emptyAction} onAction={onEmptyAction} />;
  }

  const live = events.filter(isLive);
  const upcoming = events
    .filter((e) => !isLive(e) && !hasEnded(e))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const past = events
    .filter((e) => !isLive(e) && hasEnded(e))
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
    // Paginated lists already arrive a page at a time.
    .slice(0, onLoadMore ? undefined : PAST_LIMIT);

  const sections = [
    { key: 'live', eyebrow: 'Ahora mismo', color: colors.live, title: 'En curso', list: live, dimmed: false },
    { key: 'upcoming', eyebrow: 'Organiza', color: colors.primary, title: 'Próximos', list: upcoming, dimmed: false },
    { key: 'past', eyebrow: 'Historial', color: colors.textMuted, title: 'Pasados', list: past, dimmed: true },
  ];

  return (
    <View style={{ gap: Spacing.five }}>
      {sections
        .filter((s) => s.list.length > 0)
        .map((s) => (
          <View key={s.key} style={{ gap: Spacing.three }}>
            <SectionHeader eyebrow={`${s.eyebrow} · ${s.list.length}`} eyebrowColor={s.color} title={s.title} />
            {s.list.map((e) =>
              // Finished events stay as they were; live and upcoming ones can be edited.
              editable && !s.dimmed ? (
                <View key={e.id}>
                  <RowEventCard event={e} />
                  <Pressable
                    onPress={() => router.push({ pathname: '/edit-event/[id]', params: { id: e.id } })}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${e.title}`}
                    style={[styles.edit, { backgroundColor: colors.primaryDeep }]}>
                    <Icon name="edit" size={14} color={colors.onPrimary} />
                    <AppText variant="label" color={colors.onPrimary}>
                      Editar
                    </AppText>
                  </Pressable>
                </View>
              ) : (
                <RowEventCard key={e.id} event={e} dimmed={s.dimmed} />
              ),
            )}
          </View>
        ))}
      {moreError && (
        <AppText variant="caption" color={colors.error}>
          {moreError}
        </AppText>
      )}
      {hasMore && onLoadMore && (
        <GhostButton title="Ver más" icon="add" loading={loadingMore} onPress={onLoadMore} style={{ marginTop: -Spacing.two }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Bottom-right of the card, clear of the category / distance line on top.
  edit: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
});
