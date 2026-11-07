import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { getItem, setItem } from '@/lib/storage';

/** Choices offered in settings; the API caps radiusKm at 100. */
export const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;
export type RadiusKm = (typeof RADIUS_OPTIONS)[number];
const DEFAULT_RADIUS: RadiusKm = 25;

interface PreferencesValue {
  /** How far from the user the map and Explore look for events. */
  radiusKm: RadiusKm;
  setRadiusKm: (km: RadiusKm) => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);
const RADIUS_KEY = 'eventspot.radiusKm';

/** Device-local preferences, persisted like the theme. */
export function PreferencesProvider({ children }: PropsWithChildren) {
  const [radiusKm, setRadius] = useState<RadiusKm>(DEFAULT_RADIUS);

  useEffect(() => {
    getItem(RADIUS_KEY).then((v) => {
      const km = Number(v);
      if (RADIUS_OPTIONS.includes(km as RadiusKm)) setRadius(km as RadiusKm);
    });
  }, []);

  const setRadiusKm = (km: RadiusKm) => {
    setRadius(km);
    setItem(RADIUS_KEY, String(km));
  };

  return <PreferencesContext value={{ radiusKm, setRadiusKm }}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const value = use(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return value;
}
