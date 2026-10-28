import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

/**
 * Minimal data loader: fetches when the screen gains focus (so lists reflect
 * changes made on other screens) and whenever `deps` change, and exposes
 * pull-to-refresh. Pass `null` as the fetcher to skip, e.g. while waiting for
 * the user's location.
 */
export function useQuery<T>(fetcher: (() => Promise<T>) | null, deps: unknown[]): QueryState<T> {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef(0);
  const latestFetcher = useRef(fetcher);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    latestFetcher.current = fetcher;
  });

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    const run = latestFetcher.current;
    if (!run) return;
    const id = ++request.current;
    if (mode === 'refresh') setRefreshing(true);
    try {
      const result = await run();
      if (id === request.current) {
        setDataState(result);
        setError(null);
      }
    } catch (e) {
      if (id === request.current) setError(e as Error);
    } finally {
      if (id === request.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const enabled = fetcher !== null;
  useFocusEffect(
    useCallback(() => {
      if (enabled) load('initial');
      // depsKey is intentionally listed: it re-runs the fetch when the caller's inputs change.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, enabled, depsKey]),
  );

  return {
    data,
    error,
    loading: loading && data === undefined,
    refreshing,
    refresh: () => load('refresh'),
    setData: (updater) => setDataState((prev) => updater(prev)),
  };
}
