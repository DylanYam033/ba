import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { hasEnded, isLive } from '@/lib/format';
import type { EventWithLocation } from '@/lib/types';

import { RowEventCard } from './event-cards';
import { EmptyState, SectionHeader } from './ui';

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
}: {
  events: EventWithLocation[];
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
    .slice(0, PAST_LIMIT);

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
            {s.list.map((e) => (
              <RowEventCard key={e.id} event={e} dimmed={s.dimmed} />
            ))}
          </View>
        ))}
    </View>
  );
}
