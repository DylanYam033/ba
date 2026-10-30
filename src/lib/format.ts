import type { EventSummary } from './types';

const LOCALE = 'es-CO';

export function formatDayTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
  return `${day} • ${time}`.toUpperCase();
}

export function formatLongRange(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const day = s.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
  const t = (d: Date) => d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} • ${t(s)} – ${t(e)}`;
}

export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }).toUpperCase();
}

export function formatDistance(km?: number) {
  if (km === undefined || km === null) return null;
  return km < 1 ? `${Math.round(km * 1000)} M` : `${km.toFixed(1)} KM`;
}

export function compactNumber(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
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

export type When = 'today' | 'upcoming';

/** How far ahead "Próximos" looks, counting from tomorrow. */
export const UPCOMING_DAYS = 7;

/**
 * `[from, to)` window in ISO, cut at the device's local midnights so "today" is the user's day:
 * today, or tomorrow through UPCOMING_DAYS ahead.
 */
export function timeWindow(when: When, now = new Date()) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  if (when === 'today') {
    to.setDate(to.getDate() + 1);
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
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
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
