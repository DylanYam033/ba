import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const noopSubscribe = () => () => {};

/**
 * To support static rendering, the scheme is only read after hydration; the
 * server snapshot returns null so the app falls back to its default theme.
 */
export function useColorScheme() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const colorScheme = useRNColorScheme();
  return hydrated ? colorScheme : null;
}
