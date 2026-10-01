export const PRO_STORAGE_KEY = 'csh_pro_status';

// localStorage is only a persistence hint. Pro access is granted in-memory
// after a server-side payment verification succeeds in this page session.
let verifiedProStatus: ProStatus = { active: false };
export const PRO_EVENT = 'csh:pro-status-changed';

export interface ProStatus {
  active: boolean;
  plan?: 'monthly' | 'lifetime';
  provider?: 'lemon-squeezy' | 'stripe' | 'manual';
  activatedAt?: string;
  orderId?: string;
  sessionId?: string;
}

export interface CheckoutReturn {
  result: 'success' | 'cancel';
  provider?: 'lemon-squeezy' | 'stripe';
  plan?: 'monthly' | 'lifetime';
  orderId?: string;
  sessionId?: string;
}

export function getProStatus(): ProStatus {
  return verifiedProStatus;
}

function getStoredProStatus(): ProStatus {
  if (typeof window === 'undefined') return { active: false };

  try {
    const raw = localStorage.getItem(PRO_STORAGE_KEY);
    if (!raw) return { active: false };
    const parsed = JSON.parse(raw) as ProStatus;
    return parsed && parsed.active === true ? parsed : { active: false };
  } catch {
    return { active: false };
  }
}

export function isProUser(): boolean {
  return getProStatus().active;
}

function setProStatus(
  active: boolean,
  details: Omit<ProStatus, 'active'> = {}
): void {
  if (typeof window === 'undefined') return;

  const status: ProStatus = active
    ? {
        active: true,
        ...details,
        activatedAt: details.activatedAt ?? new Date().toISOString(),
      }
    : { active: false };

  try {
    if (active) {
      localStorage.setItem(PRO_STORAGE_KEY, JSON.stringify(status));
      verifiedProStatus = status;
    } else {
      localStorage.removeItem(PRO_STORAGE_KEY);
      verifiedProStatus = { active: false };
    }
    window.dispatchEvent(new CustomEvent(PRO_EVENT, { detail: verifiedProStatus }));
  } catch {
    // Storage can be disabled by privacy settings; the app remains usable.
  }
}

/**
 * Reads the payment-provider return parameters without granting Pro access.
 * Entitlement is granted only after server-side payment verification.
 */
export function getCheckoutReturn(): CheckoutReturn | null {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const result = url.searchParams.get('csh_pro');
  if (result !== 'success' && result !== 'cancel') return null;

  const rawPlan = url.searchParams.get('plan');
  const rawProvider = url.searchParams.get('provider');

  const plan: CheckoutReturn['plan'] =
    rawPlan === 'monthly' || rawPlan === 'lifetime' ? rawPlan : undefined;
  const provider: CheckoutReturn['provider'] =
    rawProvider === 'stripe' || rawProvider === 'lemon-squeezy'
      ? rawProvider
      : undefined;

  return {
    result,
    plan,
    provider,
    orderId: url.searchParams.get('order_id') || undefined,
    sessionId: url.searchParams.get('session_id') || undefined,
  };
}

export function clearCheckoutReturn(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('csh_pro');
  url.searchParams.delete('plan');
  url.searchParams.delete('provider');
  url.searchParams.delete('order_id');
  url.searchParams.delete('session_id');
  window.history.replaceState({}, document.title, url.toString());
}

/**
 * Verifies a Lemon Squeezy order through the Vercel server function.
 * The browser never receives or sends the Lemon Squeezy API secret.
 */
export async function verifyLemonOrder(orderId: string): Promise<ProStatus | null> {
  if (!orderId) return null;

  try {
    const response = await fetch(
      `/api/verify-lemon-order?order_id=${encodeURIComponent(orderId)}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      verified?: boolean;
      plan?: 'monthly' | 'lifetime';
    };

    if (!data.verified || !data.plan) return null;

    setProStatus(true, {
      plan: data.plan,
      provider: 'lemon-squeezy',
      orderId,
    });

    return getProStatus();
  } catch {
    return null;
  }
}

export async function verifyStripeSession(sessionId: string): Promise<ProStatus | null> {
  if (!sessionId) return null;

  try {
    const response = await fetch(
      `/api/verify-stripe-session?session_id=${encodeURIComponent(sessionId)}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      verified?: boolean;
      plan?: 'monthly' | 'lifetime';
    };

    if (!data.verified || !data.plan) return null;

    setProStatus(true, {
      plan: data.plan,
      provider: 'stripe',
      sessionId,
    });

    return getProStatus();
  } catch {
    return null;
  }
}

export async function refreshStoredProStatus(): Promise<ProStatus | null> {
  const stored = getStoredProStatus();
  if (!stored.active) {
    verifiedProStatus = { active: false };
    return null;
  }

  const current = stored;

  if (current.provider === 'lemon-squeezy' && current.orderId) {
    const verified = await verifyLemonOrder(current.orderId);
    if (!verified?.active) setProStatus(false);
    return verified;
  }

  if (current.provider === 'stripe' && current.sessionId) {
    const verified = await verifyStripeSession(current.sessionId);
    if (!verified?.active) setProStatus(false);
    return verified;
  }

  // Unknown/manual browser-local states are never treated as verified.
  setProStatus(false);
  return null;
}

export async function verifyCheckoutReturn(): Promise<ProStatus | null> {
  const checkout = getCheckoutReturn();
  if (!checkout) return null;

  clearCheckoutReturn();

  if (checkout.result !== 'success') return null;
  if (checkout.provider === 'lemon-squeezy' && checkout.orderId) {
    return verifyLemonOrder(checkout.orderId);
  }

  if (checkout.provider === 'stripe' && checkout.sessionId) {
    return verifyStripeSession(checkout.sessionId);
  }

  return null;
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
