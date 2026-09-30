const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() || '';
const STORAGE_KEY = 'csh_supabase_session';
export const AUTH_EVENT = 'csh:auth-changed';

export interface AuthUser {
  id: string;
  email?: string | null;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  user: AuthUser;
}

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: AuthUser;
  error?: string;
  msg?: string;
  message?: string;
}

function ensureConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase Auth is not configured.');
  }
}

function emitAuth() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  }
}

function saveSession(session: AuthSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Keep the app usable when browser storage is unavailable.
  }
  emitAuth();
}

function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.access_token || !parsed?.refresh_token || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function authRequest(path: string, init: RequestInit = {}): Promise<AuthResponse> {
  ensureConfig();
  const headers = new Headers(init.headers);
  headers.set('apikey', SUPABASE_KEY);
  headers.set('content-type', 'application/json');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, { ...init, headers });
  const data = (await response.json().catch(() => ({}))) as AuthResponse;
  if (!response.ok) {
    throw new Error(data.msg || data.message || data.error || 'Supabase Auth request failed.');
  }
  return data;
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const data = await authRequest('token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!data.access_token || !data.refresh_token || !data.user?.id) {
    throw new Error('Supabase did not return a valid session.');
  }
  const session: AuthSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: data.expires_at ?? (data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined),
    user: data.user,
  };
  saveSession(session);
  return session;
}

export async function signUp(email: string, password: string): Promise<{ session: AuthSession | null; confirmationRequired: boolean }> {
  const data = await authRequest('signup', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    }),
  });

  if (!data.access_token || !data.refresh_token || !data.user?.id) {
    return { session: null, confirmationRequired: true };
  }

  const session: AuthSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: data.expires_at ?? (data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined),
    user: data.user,
  };
  saveSession(session);
  return { session, confirmationRequired: false };
}

export async function refreshSession(): Promise<AuthSession | null> {
  const current = readStoredSession();
  if (!current?.refresh_token) return null;

  try {
    const data = await authRequest('token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    });

    if (!data.access_token || !data.refresh_token || !data.user?.id) {
      throw new Error('Invalid refresh response.');
    }

    const session: AuthSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: data.expires_at ?? (data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined),
      user: data.user,
    };
    saveSession(session);
    return session;
  } catch {
    saveSession(null);
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const current = readStoredSession();
  if (!current) return null;

  const expiresAt = current.expires_at ?? 0;
  if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 60) {
    return refreshSession();
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${current.access_token}`,
      },
    });
    if (response.ok) {
      const user = (await response.json()) as AuthUser;
      if (user?.id) {
        const session = { ...current, user };
        saveSession(session);
        return session;
      }
    }
  } catch {
    // A transient Auth request failure does not immediately destroy the cached session.
  }

  return current;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  const current = readStoredSession();
  if (current?.access_token && SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${current.access_token}`,
        },
      });
    } catch {
      // Local session is still cleared below.
    }
  }
  saveSession(null);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export function clearLocalAuth(): void {
  saveSession(null);
}
