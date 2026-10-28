import { api } from './api';
import type {
  Attendee,
  CreateEventInput,
  EventCategory,
  EventDetail,
  EventSummary,
  EventWithLocation,
  MapPin,
  NearbyEvent,
  Paginated,
  Photo,
  Tokens,
  User,
  UserStats,
} from './types';

export interface Coords {
  lat: number;
  lng: number;
}

export const authApi = {
  login: (email: string, password: string) =>
    api<Tokens>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (input: { username: string; email: string; password: string; accountType: 'user' | 'business' }) =>
    api<Tokens & { user: User }>('/auth/register', { method: 'POST', body: input }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  me: () => api<User>('/auth/me'),
};

export const eventsApi = {
  nearby: (c: Coords, opts: { radiusKm?: number; category?: EventCategory; status?: string; limit?: number } = {}) =>
    api<Paginated<NearbyEvent>>('/events', {
      query: { lat: c.lat, lng: c.lng, radiusKm: opts.radiusKm ?? 25, category: opts.category, status: opts.status, limit: opts.limit ?? 20 },
    }),
  trending: (c: Coords, radiusKm = 25, limit = 10) =>
    api<NearbyEvent[]>('/events/trending', { query: { lat: c.lat, lng: c.lng, radiusKm, limit } }),
  mapPins: (c: Coords, radiusKm = 25, category?: EventCategory) =>
    api<MapPin[]>('/events/map-pins', { query: { lat: c.lat, lng: c.lng, radiusKm, category } }),
  get: (id: string) => api<EventDetail>(`/events/${id}`),
  create: (input: CreateEventInput) => api<EventDetail>('/events', { method: 'POST', body: input }),
  update: (id: string, body: Partial<Pick<EventSummary, 'status' | 'title' | 'description'>>) =>
    api<EventDetail>(`/events/${id}`, { method: 'PATCH', body }),
  /** Soft-cancels the event and notifies attendees (organizer only). */
  cancel: (id: string) => api<void>(`/events/${id}`, { method: 'DELETE' }),
  join: (id: string) => api<unknown>(`/events/${id}/join`, { method: 'POST' }),
  leave: (id: string) => api<void>(`/events/${id}/join`, { method: 'DELETE' }),
  save: (id: string) => api<void>(`/events/${id}/save`, { method: 'POST' }),
  unsave: (id: string) => api<void>(`/events/${id}/save`, { method: 'DELETE' }),
  attendees: (id: string, limit = 5) => api<Paginated<Attendee>>(`/events/${id}/attendees`, { query: { limit } }),
  photos: (id: string) => api<Paginated<Photo>>(`/events/${id}/photos`),
};

export const usersApi = {
  myEvents: (filter: 'going' | 'saved' | 'past') => api<EventWithLocation[]>('/users/me/events', { query: { filter } }),
  stats: (id: string) => api<UserStats>(`/users/${id}/stats`),
  update: (id: string, body: { username?: string; bio?: string; avatarUrl?: string }) =>
    api<User>(`/users/${id}`, { method: 'PATCH', body }),
};
