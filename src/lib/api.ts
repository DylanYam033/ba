import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { Tokens } from './types';

/**
 * Base URL of eventspot-api, normally EXPO_PUBLIC_API_URL from .env.local (e.g.
 * an ngrok URL). Without it we fall back to port 3000 on the host Metro is
 * served from, or localhost.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  let host = 'localhost';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    host = window.location.hostname;
  } else {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) host = hostUri.split(':')[0];
  }
  return `http://${host}:3000/api`;
}

export const API_URL = resolveBaseUrl();
if (__DEV__) console.log(`[api] API_URL = ${API_URL}`);
export const SOCKET_URL = API_URL.replace(/\/api$/, '');

/** Skips ngrok's free-tier interstitial page so tunnelled requests get JSON. */
export const TUNNEL_HEADERS = { 'ngrok-skip-browser-warning': 'true' };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

let tokens: Tokens | null = null;
let onTokensChanged: ((t: Tokens | null) => void) | null = null;
let refreshing: Promise<boolean> | null = null;

/** Called by the auth provider so the client always has the current session. */
export function configureAuth(current: Tokens | null, listener: (t: Tokens | null) => void) {
  tokens = current;
  onTokensChanged = listener;
}

export function getAccessToken() {
  return tokens?.accessToken ?? null;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!tokens?.refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...TUNNEL_HEADERS },
        body: JSON.stringify({ refreshToken: tokens!.refreshToken }),
      });
      if (!res.ok) return false;
      const body = await res.json();
      tokens = { ...tokens!, accessToken: body.data.accessToken };
      onTokensChanged?.(tokens);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

/**
 * Calls the API and unwraps its `{ success, data }` envelope. On a 401 the
 * access token is refreshed once and the request retried; if that fails the
 * session is cleared.
 */
export async function api<T>(path: string, { method = 'GET', body, query }: RequestOptions = {}): Promise<T> {
  const qs = query
    ? '?' +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';

  const send = () =>
    fetch(`${API_URL}${path}${qs}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...TUNNEL_HEADERS,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res: Response;
  try {
    res = await send();
  } catch (e) {
    if (__DEV__) console.warn(`[api] ${method} ${path} → sin respuesta (${API_URL})`, e);
    throw new ApiError(
      `No se pudo conectar con el servidor (${API_URL}). Revisa que el API esté encendido y que EXPO_PUBLIC_API_URL apunte a él.`,
      0,
      'NETWORK',
    );
  }

  if (res.status === 401 && tokens && !path.startsWith('/auth/')) {
    if (await refreshAccessToken()) {
      res = await send();
    } else {
      tokens = null;
      onTokensChanged?.(null);
    }
  }

  if (res.status === 204) {
    if (__DEV__) console.log(`[api] ${method} ${path} → 204`);
    return undefined as T;
  }

  const text = await res.text();
  let payload: { success?: boolean; data?: unknown; error?: { message?: unknown; code?: string } } | null = null;
  try {
    payload = JSON.parse(text);
  } catch {
    if (__DEV__) console.warn(`[api] ${method} ${path} → ${res.status} respuesta no JSON:`, text.slice(0, 200));
  }
  if (!res.ok || payload?.success === false) {
    const raw = payload?.error?.message ?? `Error ${res.status}`;
    const message = Array.isArray(raw) ? raw.join('\n') : String(raw);
    if (__DEV__) console.warn(`[api] ${method} ${path} → ${res.status} ${message}`);
    throw new ApiError(message, res.status, payload?.error?.code);
  }
  if (__DEV__) console.log(`[api] ${method} ${path} → ${res.status}`);
  return payload?.data as T;
}
