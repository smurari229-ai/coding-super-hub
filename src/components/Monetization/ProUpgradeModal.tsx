import React, { useState } from 'react';
import { X, Check, Zap, Shield, Sparkles, CreditCard, Heart } from 'lucide-react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'lifetime'>('lifetime');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = () => {
    setStatusMsg('Redirecting to secure Lemon Squeezy / Stripe checkout...');
    setTimeout(() => {
      setStatusMsg('Sandbox test: Pro license simulated successfully!');
      setTimeout(() => {
        setStatusMsg(null);
        onClose();
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-slate-800 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
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
            Unlock unrestricted AI Copilot generation, 100% ad-free experience, batch processing for 500+ tools, and priority feature requests.
          </p>
        </div>

        {/* Plan Switcher */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex justify-center">
            <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monthly ($9/mo)
              </button>
              <button
                onClick={() => setBillingCycle('lifetime')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'lifetime'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Lifetime Deal ($79)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Save 80%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-500/30 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-white">
                  {billingCycle === 'lifetime' ? '$79' : '$9'}
                </span>
                <span className="text-xs text-slate-400 ml-1.5">
                  {billingCycle === 'lifetime' ? 'one-time payment, forever access' : '/ month, cancel anytime'}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                Instant Activation
              </span>
            </div>

            {/* Features comparison */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              {[
                '100% Ad-Free interface across all 500+ tools',
                'Unlimited AI Copilot queries (Gemini 2.5 Flash / Pro, GPT-4o proxy)',
                'Bulk batch processing (generate up to 10,000 UUIDs / hashes / QR codes at once)',
                'Persistent cloud sync for favorites, custom snippets & history',
                'Custom CSS / theme builder & high-resolution SVG exports',
                'Priority Discord channel & direct feature requests'
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {statusMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center font-medium animate-pulse">
                {statusMsg}
              </div>
            )}

            <button
              onClick={handleCheckout}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Upgrade to Pro — {billingCycle === 'lifetime' ? '$79 Lifetime' : '$9/Month'}</span>
            </button>

            <p className="text-[11px] text-center text-slate-400">
              30-day money-back guarantee. Secure payments powered by Stripe &amp; Lemon Squeezy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
