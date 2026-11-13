import { useRef, useState } from 'react';

import { usersApi } from '@/lib/endpoints';

import { useQuery } from './use-query';

/** Events shown first and added per "Ver más". */
export const ORGANIZED_PAGE_SIZE = 5;

/**
 * A user's organized events, 5 at a time. "Ver más" appends the next page; refetching on
 * focus (e.g. back from editing) reloads everything already shown, so nothing collapses.
 */
export function useOrganizedEvents(userId: string, enabled = true) {
  // How many to reload on focus: the first page, plus every page added since.
  const shown = useRef(ORGANIZED_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const query = useQuery(enabled ? () => usersApi.events(userId, 1, shown.current) : null, [userId]);

  const events = query.data?.data ?? [];
  const hasMore = !!query.data && events.length < query.data.meta.total;

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      // Pages are cut every 5 in display order, so the next one starts right after what's shown.
      const next = await usersApi.events(userId, Math.floor(events.length / ORGANIZED_PAGE_SIZE) + 1, ORGANIZED_PAGE_SIZE);
      query.setData((prev) => {
        if (!prev) return next;
        const ids = new Set(prev.data.map((e) => e.id));
        const data = [...prev.data, ...next.data.filter((e) => !ids.has(e.id))];
        shown.current = Math.max(ORGANIZED_PAGE_SIZE, data.length);
        return { data, meta: next.meta };
      });
    } catch (e) {
      setMoreError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  return { ...query, events, hasMore, loadingMore, moreError, loadMore };
}
