import { createContext, use, useEffect, useMemo, type PropsWithChildren } from 'react';
import { io, type Socket } from 'socket.io-client';

import { useAuth } from '@/ctx/auth';
import { getAccessToken, SOCKET_URL, TUNNEL_HEADERS } from '@/lib/api';

type Namespace = 'events' | 'notifications';
type Sockets = Record<Namespace, Socket> | null;

const SocketContext = createContext<Sockets>(null);

function connect(namespace: Namespace) {
  return io(`${SOCKET_URL}/${namespace}`, {
    // A function so every reconnect sends the current (possibly refreshed) token.
    auth: (cb) => cb({ token: getAccessToken() }),
    transports: ['websocket'],
    extraHeaders: TUNNEL_HEADERS,
    autoConnect: false,
  });
}

/** One connection per API gateway, opened while signed in and shared by every screen. */
export function SocketProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id;
  // Fresh sockets per signed-in user; the effect below owns the connection.
  const sockets = useMemo<Sockets>(
    () => (userId ? { events: connect('events'), notifications: connect('notifications') } : null),
    [userId],
  );

  useEffect(() => {
    if (!sockets) return;
    sockets.events.connect();
    sockets.notifications.connect();
    return () => {
      sockets.events.disconnect();
      sockets.notifications.disconnect();
    };
  }, [sockets]);

  return <SocketContext value={sockets}>{children}</SocketContext>;
}

/** The shared socket for a gateway namespace, or null while signed out. */
export function useSocket(namespace: Namespace): Socket | null {
  return use(SocketContext)?.[namespace] ?? null;
}
