import React, { useState } from 'react';
import { Sparkles, ExternalLink, X, Heart } from 'lucide-react';

interface AdBannerProps {
  onOpenSponsor?: () => void;
  onOpenAffiliates?: () => void;
  onOpenPro?: () => void;
}

export const AdBanner: React.FC<AdBannerProps> = ({ onOpenSponsor, onOpenAffiliates, onOpenPro }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Support this free toolbox</span>
        <button 
          onClick={onOpenPro}
          className="text-indigo-400 hover:text-indigo-300 font-medium underline"
        >
          Go Pro (Ad-free)
        </button>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-950 border border-indigo-500/20 shadow-sm relative group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Developer Partner
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenPro}
            className="text-[10px] text-slate-400 hover:text-indigo-300 transition-colors"
            title="Remove ads with Pro"
          >
            Go Pro
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-500 hover:text-slate-300 p-0.5"
            title="Dismiss ad"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-white">Deploy on DigitalOcean</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
            $200 FREE
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Reliable SSD Droplets, Managed Postgres &amp; App Platform for your next production project.
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
        <a
          href="https://m.do.co/c/codinghub200"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <span>Claim $200 Credit</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <button
          onClick={onOpenAffiliates}
          className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
        >
          More Dev Deals →
        </button>
      </div>
    </div>
  );
};
