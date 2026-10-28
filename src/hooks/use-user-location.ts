import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coords } from '@/lib/endpoints';

/** Used when permission is denied or GPS is unavailable (Bogotá, Zona T). */
export const FALLBACK_COORDS: Coords = { lat: 4.6668, lng: -74.0526 };

async function resolveLocation(): Promise<{ coords: Coords; granted: boolean }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { coords: FALLBACK_COORDS, granted: false };
    const pos =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, granted: true };
  } catch {
    return { coords: FALLBACK_COORDS, granted: false };
  }
}

export function useUserLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    resolveLocation().then((r) => {
      if (!active) return;
      setCoords(r.coords);
      setGranted(r.granted);
    });
    return () => {
      active = false;
    };
  }, []);

  /** Re-reads the position (e.g. "locate me" button) and returns it. */
  const locate = async () => {
    const r = await resolveLocation();
    setCoords(r.coords);
    setGranted(r.granted);
    return r.coords;
  };

  return { coords, granted, locate };
}
