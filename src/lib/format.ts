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
