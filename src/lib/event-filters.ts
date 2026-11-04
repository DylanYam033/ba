import type { IconName } from '@/components/icon';

import type { EventSummary } from './types';

/** "Tamaño de la asistencia": filtered on the device, the API has no attendee-range param. */
export type Attendance = 'any' | '1-9' | '10-20' | '20-50' | '50-100' | '100+';
/** "Hora del día" by local start hour; also filtered on the device. */
export type DayPart = 'any' | 'dawn' | 'morning' | 'afternoon' | 'night';
/** Sent to the API as `isFree`. */
export type Price = 'any' | 'free' | 'paid';

export interface EventFilters {
  attendance: Attendance;
  dayPart: DayPart;
  price: Price;
}

export const DEFAULT_FILTERS: EventFilters = { attendance: 'any', dayPart: 'any', price: 'any' };

export const ATTENDANCE_OPTIONS: { value: Attendance; label: string; min: number; max: number }[] = [
  { value: 'any', label: 'Cualquier tamaño', min: 0, max: Infinity },
  { value: '1-9', label: '1-9 asistentes', min: 1, max: 9 },
  { value: '10-20', label: '10-20 asistentes', min: 10, max: 20 },
  { value: '20-50', label: '20-50 asistentes', min: 20, max: 50 },
  { value: '50-100', label: '50-100 asistentes', min: 50, max: 100 },
  { value: '100+', label: '100+ asistentes', min: 100, max: Infinity },
];

/** Hour ranges are [from, to) in the device's local time. */
export const DAY_PART_OPTIONS: { value: DayPart; label: string; icon: IconName; from: number; to: number }[] = [
  { value: 'any', label: 'Cualquier hora', icon: 'clock', from: 0, to: 24 },
  { value: 'dawn', label: 'Madrugada', icon: 'dawn', from: 0, to: 6 },
  { value: 'morning', label: 'Mañana', icon: 'morning', from: 6, to: 12 },
  { value: 'afternoon', label: 'Tarde', icon: 'afternoon', from: 12, to: 18 },
  { value: 'night', label: 'Noche', icon: 'night', from: 18, to: 24 },
];

export const PRICE_OPTIONS: { value: Price; label: string }[] = [
  { value: 'any', label: 'Cualquier precio' },
  { value: 'free', label: 'Gratis' },
  { value: 'paid', label: 'De pago' },
];

/** `isFree` query param for the price filter (undefined = don't filter). */
export const priceParam = (price: Price) => (price === 'any' ? undefined : price === 'free');

/** Client-side part of the filters (attendance + time of day). */
export function matchesFilters(e: Pick<EventSummary, 'currentAttendees' | 'startAt'>, f: EventFilters) {
  const size = ATTENDANCE_OPTIONS.find((o) => o.value === f.attendance)!;
  if (e.currentAttendees < size.min || e.currentAttendees > size.max) return false;
  const part = DAY_PART_OPTIONS.find((o) => o.value === f.dayPart)!;
  const hour = new Date(e.startAt).getHours();
  return hour >= part.from && hour < part.to;
}

/** Badge count on the filter button: options moved away from their default. */
export function activeFilterCount(f: EventFilters) {
  return (Object.keys(DEFAULT_FILTERS) as (keyof EventFilters)[]).filter((k) => f[k] !== DEFAULT_FILTERS[k]).length;
}
