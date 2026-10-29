import { useEffect, useRef, useState } from 'react';

import { useSocket } from '@/ctx/socket';
import type { EventStatus, Photo } from '@/lib/types';

interface AttendeePayload {
  eventId: string;
  currentAttendees: number;
}

interface LiveEventHandlers {
  onPhoto?: (photo: Photo) => void;
  onStatus?: (status: EventStatus) => void;
}

/**
 * Joins the API's `/events` gateway room for one event. Returns the live
 * attendee count (falls back to `initial` until the first update) and forwards
 * photos and status changes pushed to the room.
 */
export function useLiveEvent(eventId: string, initial: number | undefined, handlers: LiveEventHandlers = {}) {
  const socket = useSocket('events');
  const [count, setCount] = useState<number | undefined>(undefined);
  const latest = useRef(handlers);

  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!socket) return;
    const join = () => socket.emit('joinEventRoom', { eventId });
    const onAttendees = (p: AttendeePayload) => {
      if (p.eventId === eventId) setCount(p.currentAttendees);
    };
    const onPhoto = (p: { eventId: string; photo: Photo }) => {
      if (p.eventId === eventId) latest.current.onPhoto?.(p.photo);
    };
    const onStatus = (p: { eventId: string; status: EventStatus }) => {
      if (p.eventId === eventId) latest.current.onStatus?.(p.status);
    };
    if (socket.connected) join();
    socket.on('connect', join);
    socket.on('attendeeJoined', onAttendees);
    socket.on('attendeeLeft', onAttendees);
    socket.on('photoUploaded', onPhoto);
    socket.on('eventStatusChanged', onStatus);
    return () => {
      socket.emit('leaveEventRoom', { eventId });
      socket.off('connect', join);
      socket.off('attendeeJoined', onAttendees);
      socket.off('attendeeLeft', onAttendees);
      socket.off('photoUploaded', onPhoto);
      socket.off('eventStatusChanged', onStatus);
    };
  }, [socket, eventId]);

  return count ?? initial;
}
