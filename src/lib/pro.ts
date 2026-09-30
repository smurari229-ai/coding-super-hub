import { getAccessToken } from './supabase-auth';

export const PRO_STORAGE_KEY = 'csh_pro_status';
export const PRO_EVENT = 'csh:pro-status-changed';

export interface ProStatus {
  active: boolean;
  plan?: 'monthly' | 'lifetime';
  provider?: 'lemon-squeezy' | 'stripe' | 'manual';
  activatedAt?: string;
  expiresAt?: string | null;
  orderId?: string;
  sessionId?: string;
}

export interface CheckoutReturn {
  result: 'success' | 'cancel';
  provider?: 'stripe' | 'lemon-squeezy';
  plan?: 'monthly' | 'lifetime';
  orderId?: string;
  sessionId?: string;
}

let verifiedProStatus: ProStatus = { active: false };
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

function readCachedProStatus(): ProStatus {
  if (typeof window === 'undefined') return { active: false };
  try {
    const raw = localStorage.getItem(PRO_STORAGE_KEY);
    if (!raw) return { active: false };
    const parsed = JSON.parse(raw) as ProStatus & { cachedAt?: number };
    if (parsed.cachedAt && Date.now() - parsed.cachedAt > CACHE_MAX_AGE_MS) return { active: false };
    return parsed.active === true ? parsed : { active: false };
  } catch {
    return { active: false };
  }
}

function writeCache(status: ProStatus) {
  if (typeof window === 'undefined') return;
  try {
    if (status.active) {
      localStorage.setItem(PRO_STORAGE_KEY, JSON.stringify({ ...status, cachedAt: Date.now() }));
    } else {
      localStorage.removeItem(PRO_STORAGE_KEY);
    }
  } catch {
    // Browser storage is optional.
  }
}

function setVerifiedStatus(status: ProStatus) {
  verifiedProStatus = status;
  writeCache(status);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PRO_EVENT, { detail: status }));
  }
}

export function getProStatus(): ProStatus {
  if (!verifiedProStatus.active) {
    const cached = readCachedProStatus();
    if (cached.active) verifiedProStatus = cached;
  }
  return verifiedProStatus;
}

export function isProUser(): boolean {
  return verifiedProStatus.active;
}

export function getCheckoutReturn(): CheckoutReturn | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const result = url.searchParams.get('csh_pro');
  if (result !== 'success' && result !== 'cancel') return null;

  const rawPlan = url.searchParams.get('plan');
  const rawProvider = url.searchParams.get('provider');
  return {
    result,
    plan: rawPlan === 'monthly' || rawPlan === 'lifetime' ? rawPlan : undefined,
    provider: rawProvider === 'stripe' || rawProvider === 'lemon-squeezy' ? rawProvider : undefined,
    orderId: url.searchParams.get('order_id') || undefined,
    sessionId: url.searchParams.get('session_id') || undefined,
  };
}

export function clearCheckoutReturn(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const key of ['csh_pro', 'plan', 'provider', 'order_id', 'session_id']) url.searchParams.delete(key);
  window.history.replaceState({}, document.title, url.toString());
}

export async function refreshStoredProStatus(): Promise<ProStatus | null> {
  const token = await getAccessToken();
  if (!token) {
    setVerifiedStatus({ active: false });
    return null;
  }

  try {
    const response = await fetch('/api/pro-status', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      setVerifiedStatus({ active: false });
      return null;
    }

    const data = (await response.json()) as {
      active?: boolean;
      plan?: 'monthly' | 'lifetime';
      provider?: 'stripe' | 'lemon-squeezy' | 'manual';
      expires_at?: string | null;
    };

    const status: ProStatus = data.active
      ? {
          active: true,
          plan: data.plan,
          provider: data.provider,
          expiresAt: data.expires_at ?? null,
          activatedAt: new Date().toISOString(),
        }
      : { active: false };

    setVerifiedStatus(status);
    return status.active ? status : null;
  } catch {
    return null;
  }
}

export async function verifyLemonOrder(orderId: string): Promise<ProStatus | null> {
  if (!orderId) return null;
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`/api/verify-lemon-order?order_id=${encodeURIComponent(orderId)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return refreshStoredProStatus();
  } catch {
    return null;
  }
}

export async function verifyStripeSession(sessionId: string): Promise<ProStatus | null> {
  if (!sessionId) return null;
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`/api/verify-stripe-session?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return refreshStoredProStatus();
  } catch {
    return null;
  }
}

export async function verifyCheckoutReturn(): Promise<ProStatus | null> {
  const checkout = getCheckoutReturn();
  if (!checkout) return refreshStoredProStatus();

  clearCheckoutReturn();
  if (checkout.result !== 'success') return refreshStoredProStatus();

  if (checkout.provider === 'lemon-squeezy' && checkout.orderId) return verifyLemonOrder(checkout.orderId);
  if (checkout.provider === 'stripe' && checkout.sessionId) return verifyStripeSession(checkout.sessionId);

  return refreshStoredProStatus();
}

export const FREE_AI_DAILY_LIMIT = 10;
export const PRO_AI_DAILY_LIMIT = Number.POSITIVE_INFINITY;
export const FREE_BATCH_LIMIT = 100;
export const PRO_BATCH_LIMIT = 10000;

export function getAiLimit(pro: boolean): number {
  return pro ? PRO_AI_DAILY_LIMIT : FREE_AI_DAILY_LIMIT;
}

export function getBatchLimit(pro: boolean): number {
  return pro ? PRO_BATCH_LIMIT : FREE_BATCH_LIMIT;
}
