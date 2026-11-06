import * as yup from 'yup';

import type { UploadFile } from './api';
import { CATEGORY_KEYS } from './categories';
import type { Coords } from './endpoints';
import { isInPast } from './format';
import type { EventCategory } from './types';

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

/** Local start date: today + `dayIndex` days at the picked hour and minute. */
export function eventStart({ dayIndex, time }: Pick<EventFormValues, 'dayIndex' | 'time'>) {
  const d = new Date();
  d.setDate(d.getDate() + dayIndex);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

const positiveNumber = (s: string) => Number(s) > 0;

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
      // Allow a 1 h grace so an event starting "now" can still be published.
      .test('not-past', 'Esa hora ya pasó. Elige una hora futura u otro día.', function (time) {
        return !time || !isInPast(eventStart({ dayIndex: this.parent.dayIndex, time }), 60 * 60 * 1000);
      }),
    price: yup.string().when('isFree', {
      is: false,
      then: (s) => s.required('Ingresa el precio.').test('positive', 'El precio debe ser mayor a 0.', (v) => !v || positiveNumber(v)),
    }),
    capacity: yup
      .string()
      .test('capacity', 'El cupo debe ser un número entero mayor a 0.', (v) => !v || (Number.isInteger(Number(v)) && positiveNumber(v))),
  }),
];

/** Fields per step, to mark them touched (and show their errors) when "Siguiente" is pressed. */
export const EVENT_STEP_FIELDS: (keyof EventFormValues)[][] = [
  ['title', 'category', 'description'],
  ['picked', 'venueName'],
  ['time', 'price', 'capacity'],
];
