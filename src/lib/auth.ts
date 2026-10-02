const STORAGE_KEY = 'csh_auth_session';

type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email?: string | null };
};

function config() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) throw new Error('Supabase Auth is not configured.');
  return { url: url.replace(/\/$/, ''), key };
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return session?.access_token && session?.refresh_token && session?.user?.id ? session : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

async function authRequest(path: string, body: Record<string, unknown>) {
  const { url, key } = config();
  const response = await fetch(url + '/auth/v1/' + path, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.msg === 'string' ? data.msg : typeof data?.message === 'string' ? data.message : 'Authentication request failed.');
  return data;
}

export async function sendEmailOtp(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Enter a valid email address.');
  await authRequest('otp', { email: normalized, create_user: true });
}

export async function verifyEmailOtp(email: string, token: string): Promise<Session> {
  const normalized = email.trim().toLowerCase();
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error('Enter the verification code.');
  const data = await authRequest('verify', { email: normalized, token: cleanToken, type: 'email' });
  if (!data?.access_token || !data?.refresh_token || !data?.user?.id) throw new Error('Supabase did not return a valid session.');
  const session: Session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
    user: { id: data.user.id, email: data.user.email },
  };
  saveSession(session);
  return session;
}

export async function getAccessToken(): Promise<string | null> {
  const current = readSession();
  if (!current) return null;
  if (!current.expires_at || current.expires_at > Date.now() + 30_000) return current.access_token;

  try {
    const data = await authRequest('token?grant_type=refresh_token', { refresh_token: current.refresh_token });
    if (!data?.access_token || !data?.refresh_token || !data?.user?.id) throw new Error('Refresh failed.');
    const refreshed: Session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
      user: { id: data.user.id, email: data.user.email },
    };
    saveSession(refreshed);
    return refreshed.access_token;
  } catch {
    saveSession(null);
    return null;
  }
}

export function getAuthSession(): Session | null {
  return readSession();
}

export function signOut(): void {
  saveSession(null);
}
