import { useCallback, useEffect, useRef, useState } from 'react';

import type { Paginated } from '@/lib/types';

/**
 * Page-by-page loader for the API's `{ data, meta }` lists: loads page 1 when
 * `deps` change, `loadMore` appends the next page (for FlatList onEndReached)
 * and `refresh` starts over (pull-to-refresh).
 */
export function usePaginated<T>(fetchPage: (page: number) => Promise<Paginated<T>>, deps: unknown[]) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const latestFetch = useRef(fetchPage);
  const request = useRef(0);
  const busy = useRef(false);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    latestFetch.current = fetchPage;
  });

  const load = useCallback(async (next: number, mode: 'replace' | 'append' | 'refresh') => {
    const id = ++request.current;
    busy.current = true;
    try {
      const res = await latestFetch.current(next);
      if (id !== request.current) return;
      setItems((prev) => (mode === 'append' ? [...prev, ...res.data] : res.data));
      setPage(next);
      setHasMore(next < res.meta.totalPages);
      setError(null);
    } catch (e) {
      if (id === request.current) setError(e as Error);
    } finally {
      if (id === request.current) {
        busy.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    load(1, 'replace');
    // depsKey re-runs the first page when the caller's inputs change.
  }, [load, depsKey]);

  return {
    items,
    setItems,
    loading: loading && items.length === 0,
    refreshing,
    loadingMore,
    error,
    refresh: () => {
      setRefreshing(true);
      return load(1, 'refresh');
    },
    loadMore: () => {
      if (busy.current || !hasMore) return;
      setLoadingMore(true);
      load(page + 1, 'append');
    },
  };
}
