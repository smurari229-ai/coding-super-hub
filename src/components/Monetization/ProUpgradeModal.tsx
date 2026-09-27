import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, Zap, CreditCard, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { getProStatus, setProStatus } from '../../lib/pro';

type BillingCycle = 'monthly' | 'lifetime';
type PaymentProvider = 'lemon-squeezy' | 'stripe';

const CHECKOUT_URLS: Record<PaymentProvider, Record<BillingCycle, string>> = {
  'lemon-squeezy': {
    monthly: (import.meta.env.VITE_LEMON_SQUEEZY_MONTHLY_URL as string | undefined)?.trim() || '',
    lifetime: (import.meta.env.VITE_LEMON_SQUEEZY_LIFETIME_URL as string | undefined)?.trim() || ''
  },
  stripe: {
    monthly: (import.meta.env.VITE_STRIPE_MONTHLY_URL as string | undefined)?.trim() || '',
    lifetime: (import.meta.env.VITE_STRIPE_LIFETIME_URL as string | undefined)?.trim() || ''
  }
};

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('lifetime');
  const [provider, setProvider] = useState<PaymentProvider>('lemon-squeezy');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkoutUrl = useMemo(
    () => CHECKOUT_URLS[provider][billingCycle],
    [provider, billingCycle]
  );

  useEffect(() => {
    const existing = getProStatus();
    if (existing.active) {
      setStatusMsg('Pro is active on this browser.');
    } else if (window.location.search.includes('csh_pro=cancel')) {
      setStatusMsg('Checkout was cancelled. No Pro entitlement was changed.');
      const url = new URL(window.location.href);
      url.searchParams.delete('csh_pro');
      url.searchParams.delete('plan');
      url.searchParams.delete('provider');
      url.searchParams.delete('order_id');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  if (!isOpen) return null;

  const handleCheckout = () => {
    if (!checkoutUrl) {
      setStatusMsg(
        provider === 'lemon-squeezy'
          ? 'Lemon Squeezy checkout is not configured yet.'
          : 'Stripe checkout is not configured yet.'
      );
      return;
    }

    setIsLoading(true);
    setStatusMsg('Opening secure checkout…');

    window.setTimeout(() => {
      if (provider === 'lemon-squeezy') {
        const lemon = (window as unknown as {
          LemonSqueezy?: {
            Url?: { Open?: (url: string) => void };
          };
        }).LemonSqueezy;

        if (lemon?.Url?.Open) {
          lemon.Url.Open(checkoutUrl);
          setIsLoading(false);
          return;
        }
      }

      window.location.assign(checkoutUrl);
    }, 350);
  };

  const handleManualActivation = () => {
    setProStatus(true, { plan: billingCycle, provider: 'manual' });
    setStatusMsg('Pro enabled locally for testing. Remove this testing action before public launch.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="relative p-6 border-b border-slate-800 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close Pro upgrade dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Zap className="w-4 h-4 fill-indigo-400" />
            <span>Coding Super Hub Pro</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Supercharge Your Daily Engineering Workflow
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            Ad-free tools, higher AI limits, and higher batch-processing limits.
          </p>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex flex-col gap-3">
            <div className="flex justify-center">
              <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    billingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Monthly ($9/mo)
                </button>
                <button
                  onClick={() => setBillingCycle('lifetime')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    billingCycle === 'lifetime' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Lifetime ($79)
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
                <button
                  onClick={() => setProvider('lemon-squeezy')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    provider === 'lemon-squeezy' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Lemon Squeezy (recommended)
                </button>
                <button
                  onClick={() => setProvider('stripe')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    provider === 'stripe' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Stripe
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-500/30 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-white">
                  {billingCycle === 'lifetime' ? '$79' : '$9'}
                </span>
                <span className="text-xs text-slate-400 ml-1.5">
                  {billingCycle === 'lifetime' ? 'one-time payment' : '/ month, cancel anytime'}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                Secure checkout
              </span>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              {[
                '100% ad-free interface',
                'Higher AI Copilot limits',
                'Higher batch-processing limits',
                'Pro-only features as they are released',
                'Priority feature requests'
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {statusMsg && (
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 text-xs text-center font-medium">
                {statusMsg}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              <span>{isLoading ? 'Opening checkout…' : `Upgrade — $${billingCycle === 'lifetime' ? '79 Lifetime' : '9/Month'}`}</span>
            </button>

            <div className="flex gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Payment links are configured by you in Vercel environment variables. Never put Stripe secret keys or Lemon Squeezy API keys in this client app.
              </span>
            </div>

            <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Checkout is handled by {provider === 'lemon-squeezy' ? 'Lemon Squeezy' : 'Stripe'}.
            </p>
          </div>

          {import.meta.env.DEV && (
            <button
              onClick={handleManualActivation}
              className="w-full text-[10px] text-slate-500 hover:text-slate-300 underline"
            >
              Dev-only: enable Pro locally for UI testing
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
