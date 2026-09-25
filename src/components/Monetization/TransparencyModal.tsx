import React from 'react';
import { X, ShieldCheck, HeartHandshake, Lock, EyeOff, Sparkles } from 'lucide-react';

interface TransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransparencyModal: React.FC<TransparencyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Monetization &amp; Privacy Transparency</h2>
              <p className="text-xs text-slate-400">How Coding Super Hub makes money without compromising privacy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-300 leading-relaxed flex-1">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>1. 100% Client-Side Privacy Guarantee</span>
            </div>
            <p className="text-slate-400">
              Your code, passwords, JWT tokens, hashes, and inputs <strong>never leave your computer</strong>. All cryptographic computations, formatting, and regex checks run entirely in your local browser sandbox.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-white">
              <HeartHandshake className="w-4 h-4 text-indigo-400" />
              <span>2. Curated Affiliate Partnerships</span>
            </div>
            <p className="text-slate-400">
              When you sign up for cloud services (like DigitalOcean, Supabase, Cursor, or Railway) through our referral links, we earn a small affiliate commission at zero additional cost to you (and you often get exclusive promotional credits like $200 free cloud balance).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>3. Optional Pro Membership</span>
            </div>
            <p className="text-slate-400">
              Power users can support the platform by purchasing a Pro membership ($9/mo or $79 lifetime) which unlocks unlimited AI token proxies, removes developer sponsor banners, and enables high-throughput batch generation.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-white">
              <EyeOff className="w-4 h-4 text-rose-400" />
              <span>4. Zero Tracking Cookies</span>
            </div>
            <p className="text-slate-400">
              We never use invasive tracking cookies, cross-site trackers, or sell analytics data to third-party ad brokers.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
