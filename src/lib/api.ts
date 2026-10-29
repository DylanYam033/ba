import Constants from 'expo-constants';
import { File, UploadType } from 'expo-file-system';
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

/**
 * Uploaded files come back as paths relative to the API origin (e.g.
 * `/uploads/x.jpg`) so they keep working when the tunnel URL changes.
 */
export function mediaUrl(url: string): string {
  return url.startsWith('/') ? `${SOCKET_URL}${url}` : url;
}

/** expo-image source for an API image; the tunnel header avoids ngrok's HTML interstitial. */
export function mediaSource(url: string) {
  return { uri: mediaUrl(url), headers: TUNNEL_HEADERS };
}

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
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Query;
}

/** The bits of a response `request` reads; satisfied by fetch's Response and by native uploads. */
interface RawResponse {
  status: number;
  ok: boolean;
  text: () => Promise<string>;
}

/** Sends one attempt with the given auth/tunnel headers; called again on a retry after a token refresh. */
type Transport = (url: string, headers: Record<string, string>) => Promise<RawResponse>;

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
  return request<T>(method, `${path}${qs}`, (url, headers) =>
    fetch(url, {
      method,
      headers: body !== undefined ? { ...headers, 'Content-Type': 'application/json' } : headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  );
}

/** A picked image to upload (see lib/pick-image.ts). */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
  /** Web only: the browser File to put in FormData. */
  file?: Blob;
}

/**
 * POSTs `file` as multipart/form-data (field "file") plus optional text fields.
 * On native this uses expo-file-system's upload: the global fetch is expo/fetch,
 * which can't send React Native's `{ uri, name, type }` FormData parts.
 */
export function upload<T>(path: string, file: UploadFile, fields: Record<string, string | undefined> = {}): Promise<T> {
  const parameters = Object.fromEntries(Object.entries(fields).filter((e): e is [string, string] => !!e[1]));

  if (Platform.OS === 'web') {
    return request<T>('POST', path, (url, headers) => {
      const form = new FormData();
      for (const [k, v] of Object.entries(parameters)) form.append(k, v);
      if (file.file) form.append('file', file.file, file.name);
      // No Content-Type: fetch adds multipart with its boundary.
      return fetch(url, { method: 'POST', headers, body: form });
    });
  }

  return request<T>('POST', path, async (url, headers) => {
    const result = await new File(file.uri).upload(url, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: file.type,
      parameters,
      headers,
    });
    return { status: result.status, ok: result.status >= 200 && result.status < 300, text: async () => result.body };
  });
}

async function request<T>(method: Method, pathAndQuery: string, transport: Transport): Promise<T> {
  const path = pathAndQuery.split('?')[0];
  const send = () =>
    transport(`${API_URL}${pathAndQuery}`, {
      Accept: 'application/json',
      ...TUNNEL_HEADERS,
      ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
    });

  let res: RawResponse;
  try {
    res = await send();
  } catch (e) {
    if (__DEV__) console.warn(`[api] ${method} ${path} → sin respuesta (${API_URL})`, e);
    // In development, show the underlying error too: it tells a dead server apart from a client-side failure.
    const detail = __DEV__ && e instanceof Error ? `\n[${e.message}]` : '';
    throw new ApiError(
      `No se pudo conectar con el servidor (${API_URL}). Revisa que el API esté encendido y que EXPO_PUBLIC_API_URL apunte a él.${detail}`,
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
