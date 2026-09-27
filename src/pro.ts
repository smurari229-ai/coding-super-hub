const PRO_STORAGE_KEY = 'csh_pro_status';
const PRO_PLAN_KEY = 'csh_pro_plan';

export type ProPlan = 'monthly' | 'lifetime';

export function isProUser(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PRO_STORAGE_KEY) === 'active';
}

export function setProStatus(active: boolean, plan?: ProPlan): void {
  if (typeof window === 'undefined') return;
  if (active) {
    localStorage.setItem(PRO_STORAGE_KEY, 'active');
    if (plan) localStorage.setItem(PRO_PLAN_KEY, plan);
  } else {
    localStorage.removeItem(PRO_STORAGE_KEY);
    localStorage.removeItem(PRO_PLAN_KEY);
  }
  window.dispatchEvent(new CustomEvent('csh:pro-status', { detail: { active, plan } }));
}

export function getProPlan(): ProPlan | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(PRO_PLAN_KEY);
  return value === 'monthly' || value === 'lifetime' ? value : null;
}

export function getFreeBatchLimit(): number { return 100; }
export function getProBatchLimit(): number { return 10000; }
export function getAiLimit(isPro: boolean): number {
  return isPro ? Number.POSITIVE_INFINITY : 10;
}
