import type { EventSummary } from './types';

const LOCALE = 'es-CO';

/** App-wide text case: only the first letter uppercase ("Mié, 28 de oct"), never all caps. */
export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDayTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
  return capitalize(`${day} • ${time}`);
}

export function formatLongRange(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const day = s.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
  const t = (d: Date) => d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
  return `${capitalize(day)} • ${t(s)} – ${t(e)}`;
}

export function formatShortDate(iso: string) {
  return capitalize(new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }));
}

export function formatDistance(km?: number) {
  if (km === undefined || km === null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const COMPACT_UNITS = [
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'k'],
] as const;

/**
 * Social-style counters: 999 → "999", 1 234 → "1.2k", 15 400 → "15k", 2 500 000 → "2.5M".
 * Truncates instead of rounding, so 999 999 reads "999k" rather than "1000k".
 */
export function compactNumber(n: number) {
  for (const [size, suffix] of COMPACT_UNITS) {
    if (n >= size) {
      const value = n / size;
      // One decimal only below 10 (1.2k, 9.9M); whole numbers above (15k, 120M).
      const shown = value < 10 ? Math.floor(value * 10) / 10 : Math.floor(value);
      return `${shown}${suffix}`;
    }
  }
  return String(n);
}

export function hasEnded(e: Pick<EventSummary, 'status' | 'endAt'>) {
  return e.status === 'finished' || new Date(e.endAt).getTime() < Date.now();
}

/** True when `date` is more than `graceMs` in the past. */
export function isInPast(date: Date, graceMs = 0) {
  return date.getTime() < Date.now() - graceMs;
}

/** Live if the API says so, or if "now" falls inside a published event's window. */
export function isLive(e: Pick<EventSummary, 'status' | 'startAt' | 'endAt'>) {
  if (e.status === 'live') return true;
  const now = Date.now();
  return e.status === 'published' && new Date(e.startAt).getTime() <= now && new Date(e.endAt).getTime() > now;
}

export function priceLabel(e: Pick<EventSummary, 'isFree' | 'price' | 'currency'>) {
  if (e.isFree || !e.price) return 'Gratis';
  return `${e.currency ?? ''} ${e.price.toLocaleString(LOCALE)}`.trim();
}

export type When = 'today' | 'tomorrow' | 'weekend' | 'upcoming';

/** How far ahead "Próximos" looks, counting from tomorrow. */
export const UPCOMING_DAYS = 7;

/**
 * `[from, to)` window in ISO, cut at the device's local midnights so "today" is the user's day:
 * - today / tomorrow: that calendar day;
 * - weekend: Saturday + Sunday (from today if it's already the weekend);
 * - upcoming: tomorrow through UPCOMING_DAYS ahead.
 */
export function timeWindow(when: When, now = new Date()) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  if (when === 'today') {
    to.setDate(to.getDate() + 1);
  } else if (when === 'tomorrow') {
    from.setDate(from.getDate() + 1);
    to.setDate(to.getDate() + 2);
  } else if (when === 'weekend') {
    const day = from.getDay(); // 0 = domingo … 6 = sábado
    if (day !== 0 && day !== 6) from.setDate(from.getDate() + (6 - day));
    to.setTime(from.getTime());
    // Up to the Monday after: 2 days from Saturday, 1 from Sunday.
    to.setDate(to.getDate() + (from.getDay() === 6 ? 2 : 1));
  } else {
    from.setDate(from.getDate() + 1);
    to.setDate(to.getDate() + 1 + UPCOMING_DAYS);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Day heading for event lists: "Hoy", "Mañana" or "Sábado 31 de octubre". */
export function formatDayHeading(iso: string, now = new Date()) {
  const d = new Date(iso);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Live events that started on an earlier day still belong under "Hoy".
  if (d <= now || d.toDateString() === now.toDateString()) return 'Hoy';
  if (d.toDateString() === tomorrow.toDateString()) return 'Mañana';
  const day = d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
  return capitalize(day);
}

/** "ahora", "hace 5 min", "hace 3 h", "hace 2 d", then a short date. */
export function formatRelative(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days < 7 ? `hace ${days} d` : formatShortDate(iso);
}
