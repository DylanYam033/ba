import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react';

import { configureAuth } from '@/lib/api';
import { authApi } from '@/lib/endpoints';
import { getItem, setItem } from '@/lib/storage';
import type { Tokens, User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { username: string; email: string; password: string; accountType: 'user' | 'business' }) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKENS_KEY = 'eventspot.tokens';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  const persistTokens = useCallback((t: Tokens | null) => {
    setItem(TOKENS_KEY, t ? JSON.stringify(t) : null);
    if (!t) setUser(null);
  }, []);

  const startSession = useCallback(
    async (t: Tokens) => {
      configureAuth(t, persistTokens);
      persistTokens(t);
      setUser(await authApi.me());
    },
    [persistTokens],
  );

  // Restore the stored session on launch.
  useEffect(() => {
    (async () => {
      try {
        const raw = await getItem(TOKENS_KEY);
        if (raw) await startSession(JSON.parse(raw));
      } catch (e) {
        if (__DEV__) console.warn('[auth] no se pudo restaurar la sesión', e);
        configureAuth(null, persistTokens);
        await setItem(TOKENS_KEY, null);
      } finally {
        setLoading(false);
      }
    })();
  }, [startSession, persistTokens]);

  const signIn = async (email: string, password: string) => {
    await startSession(await authApi.login(email.trim().toLowerCase(), password));
  };

  const signUp: AuthContextValue['signUp'] = async (input) => {
    const { accessToken, refreshToken } = await authApi.register({ ...input, email: input.email.trim().toLowerCase() });
    await startSession({ accessToken, refreshToken });
  };

  const signOut = async () => {
    await authApi.logout().catch(() => undefined);
    configureAuth(null, persistTokens);
    persistTokens(null);
  };

  return (
    <AuthContext value={{ user, isLoading, signIn, signUp, signOut, setUser }}>{children}</AuthContext>
  );
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** For screens inside the protected group, where a user is guaranteed. */
export function useCurrentUser() {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser called without a session');
  return user;
}
