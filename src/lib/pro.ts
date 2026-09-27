export const PRO_STORAGE_KEY = 'csh_pro_status';
export const PRO_EVENT = 'csh:pro-status-changed';

export interface ProStatus {
  active: boolean;
  plan?: 'monthly' | 'lifetime';
  provider?: 'lemon-squeezy' | 'stripe' | 'manual';
  activatedAt?: string;
}

export function getProStatus(): ProStatus {
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

export function setProStatus(
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
    } else {
      localStorage.removeItem(PRO_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent(PRO_EVENT, { detail: status }));
  } catch {
    // Storage can be disabled by privacy settings; the app remains usable.
  }
}

/**
 * Checkout providers redirect back to the app with csh_pro=success/cancel.
 * This creates a browser-local entitlement as requested for the client-only
 * architecture. It is intentionally not presented as tamper-proof billing
 * verification; a future server/webhook entitlement service should replace it.
 */
export function consumeCheckoutResult(): ProStatus | null {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const result = url.searchParams.get('csh_pro');

  if (result !== 'success' && result !== 'cancel') return null;

  if (result === 'success') {
    const rawPlan = url.searchParams.get('plan');
    const rawProvider = url.searchParams.get('provider');

    const plan: ProStatus['plan'] =
      rawPlan === 'monthly' || rawPlan === 'lifetime' ? rawPlan : undefined;
    const provider: ProStatus['provider'] =
      rawProvider === 'stripe' || rawProvider === 'lemon-squeezy'
        ? rawProvider
        : undefined;

    setProStatus(true, { plan, provider });
  }

  url.searchParams.delete('csh_pro');
  url.searchParams.delete('plan');
  url.searchParams.delete('provider');
  window.history.replaceState({}, document.title, url.toString());

  return result === 'success' ? getProStatus() : { active: false };
}
