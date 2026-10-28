import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { Colors, type Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getItem, setItem } from '@/lib/storage';

type Scheme = 'light' | 'dark';

interface ThemeContextValue {
  scheme: Scheme;
  colors: Palette;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const KEY = 'eventspot.theme';

/** Neon Pulse is dark-first: we only follow the OS when the user hasn't chosen. */
export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [override, setOverride] = useState<Scheme | null>(null);

  useEffect(() => {
    getItem(KEY).then((v) => {
      if (v === 'light' || v === 'dark') setOverride(v);
    });
  }, []);

  const scheme: Scheme = override ?? (system === 'light' ? 'light' : 'dark');

  const toggle = () => {
    const next = scheme === 'dark' ? 'light' : 'dark';
    setOverride(next);
    setItem(KEY, next);
  };

  return <ThemeContext value={{ scheme, colors: Colors[scheme], toggle }}>{children}</ThemeContext>;
}

export function useAppTheme() {
  const value = use(ThemeContext);
  if (!value) throw new Error('useAppTheme must be used inside <AppThemeProvider>');
  return value;
}
