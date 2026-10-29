import type { Href } from 'expo-router';

import type { IconName } from '@/components/icon';

import type { AppNotification, NotificationType } from './types';

interface Copy {
  title: string;
  body?: string | null;
  icon: IconName;
}

type Data = NonNullable<AppNotification['data']> & { eventTitle?: string; username?: string };

const ICONS: Record<NotificationType, IconName> = {
  event_starting: 'bolt',
  new_attendee: 'personAdd',
  event_updated: 'edit',
  event_cancelled: 'close',
  new_photo: 'photos',
  new_follower: 'personAdd',
  event_recommendation: 'fire',
};

/**
 * Spanish copy for a notification. The API stores English titles, so we
 * rebuild them from `type` + `data`; older rows without names fall back to
 * the stored title.
 */
export function describeNotification(n: AppNotification): Copy {
  const d = (n.data ?? {}) as Data;
  const icon = ICONS[n.type] ?? 'bell';
  const event = d.eventTitle;
  const user = d.username && `@${d.username}`;

  switch (n.type) {
    case 'event_starting':
      if (event) return { icon, title: `¡${event} ya empezó!`, body: 'Llega ahora y únete al plan.' };
      break;
    case 'event_cancelled':
      if (event) return { icon, title: `${event} fue cancelado`, body: 'El organizador canceló el evento.' };
      break;
    case 'new_follower':
      if (user) return { icon, title: `${user} empezó a seguirte` };
      break;
    case 'new_photo':
      if (user && event) return { icon, title: `${user} compartió una foto de ${event}`, body: n.body };
      break;
  }
  return { icon, title: n.title, body: n.body };
}

/** Where tapping the notification should go, if anywhere. */
export function notificationTarget(n: AppNotification): Href | null {
  const d = n.data ?? {};
  if (n.type === 'new_follower' && d.userId) return { pathname: '/user/[id]', params: { id: d.userId } };
  if (d.eventId) return { pathname: '/event/[id]', params: { id: d.eventId } };
  if (d.userId) return { pathname: '/user/[id]', params: { id: d.userId } };
  return null;
}
