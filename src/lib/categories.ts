import type { IconName } from '@/components/icon';

import type { EventCategory } from './types';

interface CategoryMeta {
  label: string;
  emoji: string;
  icon: IconName;
  /** Accent used for pins and badges; readable on both themes. */
  color: string;
}

export const CATEGORIES: Record<EventCategory, CategoryMeta> = {
  food: { label: 'Comida', emoji: '🍽️', icon: 'food', color: '#f97316' },
  nightlife: { label: 'Nightlife', emoji: '🪩', icon: 'nightlife', color: '#c863fb' },
  music: { label: 'Música', emoji: '🎵', icon: 'music', color: '#ff506c' },
  sports: { label: 'Deportes', emoji: '⚽', icon: 'sports', color: '#22c55e' },
  art: { label: 'Arte', emoji: '🎨', icon: 'art', color: '#f59e0b' },
  festival: { label: 'Festival', emoji: '🎪', icon: 'festival', color: '#ec4899' },
  corporate: { label: 'Corporativo', emoji: '🏢', icon: 'corporate', color: '#60a5fa' },
  community: { label: 'Comunidad', emoji: '👥', icon: 'community', color: '#2dd4bf' },
  cinema: { label: 'Cine', emoji: '🎬', icon: 'cinema', color: '#a78bfa' },
  wellness: { label: 'Bienestar', emoji: '🧘', icon: 'wellness', color: '#34d399' },
  food_truck: { label: 'Food Truck', emoji: '🍕', icon: 'foodTruck', color: '#fb923c' },
  other: { label: 'Otro', emoji: '✨', icon: 'other', color: '#00d2fd' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as EventCategory[];
