import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { getAccessToken, SOCKET_URL, TUNNEL_HEADERS } from '@/lib/api';

interface AttendeePayload {
  eventId: string;
  currentAttendees: number;
}

/**
 * Subscribes to the API's `/events` gateway room for one event and returns the
 * live attendee count. Falls back to `initial` until the first update arrives.
 */
export function useLiveAttendees(eventId: string, initial: number | undefined) {
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const socket = io(`${SOCKET_URL}/events`, { auth: { token }, transports: ['websocket'], extraHeaders: TUNNEL_HEADERS });
    const onUpdate = (p: AttendeePayload) => {
      if (p.eventId === eventId) setCount(p.currentAttendees);
    };
    socket.on('connect', () => socket.emit('joinEventRoom', { eventId }));
    socket.on('attendeeJoined', onUpdate);
    socket.on('attendeeLeft', onUpdate);
    return () => {
      socket.emit('leaveEventRoom', { eventId });
      socket.disconnect();
    };
  }, [eventId]);

  return count ?? initial;
}
