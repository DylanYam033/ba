import { createContext, use, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { useSocket } from '@/ctx/socket';
import { notificationsApi } from '@/lib/endpoints';
import type { AppNotification } from '@/lib/types';

type Listener = (n: AppNotification) => void;

interface NotificationsContextValue {
  unreadCount: number;
  setUnreadCount: (updater: (n: number) => number) => void;
  /** Subscribe to notifications pushed live; returns the unsubscribe function. */
  subscribe: (listener: Listener) => () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * Keeps the unread badge in sync: loads the count on every (re)connect and
 * bumps it when the API pushes `newNotification` to the user's room.
 */
export function NotificationsProvider({ children }: PropsWithChildren) {
  const socket = useSocket('notifications');
  const [unreadCount, setUnread] = useState(0);
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      socket.emit('joinUserRoom');
      notificationsApi
        .unreadCount()
        .then((r) => setUnread(r.count))
        .catch(() => undefined);
    };
    const onNew = ({ notification }: { notification: AppNotification }) => {
      setUnread((n) => n + 1);
      listeners.current.forEach((l) => l(notification));
    };
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('newNotification', onNew);
    return () => {
      socket.off('connect', onConnect);
      socket.off('newNotification', onNew);
    };
  }, [socket]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return (
    // Signed out → no badge, even if a stale count is still in state.
    <NotificationsContext value={{ unreadCount: socket ? unreadCount : 0, setUnreadCount: setUnread, subscribe }}>
      {children}
    </NotificationsContext>
  );
}

export function useNotifications() {
  const value = use(NotificationsContext);
  if (!value) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return value;
}
