import * as yup from 'yup';

import { CATEGORY_KEYS } from './categories';
import type { EventCategory } from './types';

export interface CommunityFormValues {
  name: string;
  description: string;
  category: EventCategory | null;
}

// Mirrors CreateCommunityDto in eventspot-api.
export const communitySchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('Ponle un nombre a tu comunidad.')
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(100, 'El nombre no puede pasar de 100 caracteres.'),
  description: yup.string().max(1000, 'La descripción no puede pasar de 1000 caracteres.'),
  category: yup.mixed<EventCategory>().oneOf(CATEGORY_KEYS).nullable(),
});
