import * as yup from 'yup';

import type { UploadFile } from './api';
import { CATEGORY_KEYS } from './categories';
import type { Coords } from './endpoints';
import { isInPast } from './format';
import type { EventCategory, EventSummary } from './types';

export interface EventFormValues {
  title: string;
  category: EventCategory | null;
  description: string;
  picked: Coords | null;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  /** Days from today (0 = hoy). */
  dayIndex: number;
  /** Only hours and minutes are used. */
  time: Date;
  durationHours: number;
  isFree: boolean;
  price: string;
  capacity: string;
  tags: string;
  /** Cover picked on the device; uploaded right after the event is created. */
  cover: UploadFile | null;
  /** Publish on behalf of this owned community; null = as yourself. */
  communityId: string | null;
}

export function initialEventForm(communityId: string | null = null): EventFormValues {
  const time = new Date();
  time.setHours(20, 0, 0, 0);
  return {
    title: '',
    category: null,
    description: '',
    picked: null,
    venueName: '',
    venueAddress: '',
    venueCity: '',
    dayIndex: 0,
    time,
    durationHours: 4,
    isFree: true,
    price: '',
    capacity: '',
    tags: '',
    cover: null,
    communityId,
  };
}

/** Duration choices, in hours. */
export const DURATIONS = [2, 3, 4, 6, 8];

/** Date chips: today and the following days, labelled "Hoy", "Mañana", "vie 14"… */
export function nextDays(count: number) {
  return [...Array(count)].map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
    return { date: d, label };
  });
}

/** Local start date: today + `dayIndex` days at the picked hour and minute. */
export function eventStart({ dayIndex, time }: Pick<EventFormValues, 'dayIndex' | 'time'>) {
  const d = new Date();
  d.setDate(d.getDate() + dayIndex);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

const positiveNumber = (s: string) => Number(s) > 0;

/** A new event must start at least this long from now. */
const MIN_NOTICE_MS = 15 * 60 * 1000;

const priceSchema = yup.string().when('isFree', {
  is: false,
  then: (s) => s.required('Ingresa el precio.').test('positive', 'El precio debe ser mayor a 0.', (v) => !v || positiveNumber(v)),
});
const capacitySchema = yup
  .string()
  .test('capacity', 'El cupo debe ser un número entero mayor a 0.', (v) => !v || (Number.isInteger(Number(v)) && positiveNumber(v)));

/** Editing an existing event (location and tags stay as created). */
export interface EditEventValues
  extends Pick<EventFormValues, 'title' | 'category' | 'description' | 'dayIndex' | 'time' | 'durationHours' | 'isFree' | 'price' | 'capacity' | 'cover'> {
  /** The start saved on the server, to tell whether the time was changed. */
  originalStart: Date;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function editEventForm(event: EventSummary): EditEventValues {
  const start = new Date(event.startAt);
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayIndex = Math.max(0, Math.round((startDay.getTime() - today.getTime()) / DAY_MS));
  return {
    title: event.title,
    category: event.category,
    description: event.description ?? '',
    dayIndex,
    time: start,
    durationHours: Math.max(1, Math.round((new Date(event.endAt).getTime() - start.getTime()) / HOUR_MS)),
    isFree: event.isFree,
    price: event.price ? String(event.price) : '',
    capacity: event.maxCapacity ? String(event.maxCapacity) : '',
    cover: null,
    // Rebuilt like the form builds it (whole minutes), so an untouched time compares equal.
    originalStart: eventStart({ dayIndex, time: start }),
  };
}

/** True when the picked day/hour differs from the saved start. */
export const startChanged = (v: Pick<EditEventValues, 'dayIndex' | 'time' | 'originalStart'>) =>
  eventStart(v).getTime() !== v.originalStart.getTime();

export const EDIT_EVENT_SCHEMA = yup.object({
  title: yup
    .string()
    .trim()
    .required('Ponle un nombre al evento.')
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(200, 'El nombre no puede pasar de 200 caracteres.'),
  category: yup.mixed<EventCategory>().oneOf(CATEGORY_KEYS).required('Elige una categoría.'),
  description: yup.string().max(2000, 'La descripción no puede pasar de 2000 caracteres.'),
  // Only a new start must be upcoming; keeping the saved one is always fine.
  time: yup.date().test('not-past', 'Esa hora ya pasó. Elige una hora futura u otro día.', function (time) {
    const v = this.parent as EditEventValues;
    return !time || !startChanged({ ...v, time }) || !isInPast(eventStart({ dayIndex: v.dayIndex, time }));
  }),
  price: priceSchema,
  capacity: capacitySchema,
});

/** One schema per wizard step, so "Siguiente" only checks the fields on screen. */
export const EVENT_STEP_SCHEMAS = [
  yup.object({
    title: yup
      .string()
      .trim()
      .required('Ponle un nombre al evento.')
      .min(3, 'El nombre debe tener al menos 3 caracteres.')
      .max(200, 'El nombre no puede pasar de 200 caracteres.'),
    category: yup.mixed<EventCategory>().oneOf(CATEGORY_KEYS).required('Elige una categoría.'),
    description: yup.string().max(2000, 'La descripción no puede pasar de 2000 caracteres.'),
  }),
  yup.object({
    picked: yup
      .mixed<Coords>()
      .required('Toca el mapa (o usa tu ubicación) para fijar el pin.'),
    venueName: yup.string().trim().required('Escribe el nombre del lugar.').min(2, 'El nombre del lugar es muy corto.'),
  }),
  yup.object({
    time: yup
      .date()
      .required('Elige la hora de inicio.')
      // Today's events need at least 15 min of notice (later days always pass).
      .test('min-notice', function (time) {
        if (!time || eventStart({ dayIndex: this.parent.dayIndex, time }).getTime() >= Date.now() + MIN_NOTICE_MS) return true;
        const earliest = new Date(Date.now() + MIN_NOTICE_MS).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
        return this.createError({ message: `Para hoy, elige una hora desde las ${earliest} (mínimo 15 min desde ahora) u otro día.` });
      }),
    price: priceSchema,
    capacity: capacitySchema,
  }),
];

/** Fields per step, to mark them touched (and show their errors) when "Siguiente" is pressed. */
export const EVENT_STEP_FIELDS: (keyof EventFormValues)[][] = [
  ['title', 'category', 'description'],
  ['picked', 'venueName'],
  ['time', 'price', 'capacity'],
];
