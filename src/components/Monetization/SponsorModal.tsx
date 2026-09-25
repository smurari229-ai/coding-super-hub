import React, { useState } from 'react';
import { X, Heart, Coffee, Github, Copy, Check, ExternalLink } from 'lucide-react';

interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SponsorModal: React.FC<SponsorModalProps> = ({ isOpen, onClose }) => {
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('smurari229@okaxis');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Heart className="w-5 h-5 fill-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Support Coding Super Hub</h2>
              <p className="text-xs text-slate-400">Help keep 500+ developer utilities free and fast for everyone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Coding Super Hub is maintained by independent developers. Every contribution helps cover hosting costs, AI inference quotas, and ongoing tool development!
          </p>

          <div className="space-y-2.5">
            {/* Buy Me a Coffee */}
            <a
              href="https://buymeacoffee.com/smurari"
              target="_blank"
              rel="noreferrer"
              className="p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Coffee className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="font-semibold text-xs text-white block">Buy Me a Coffee</span>
                  <span className="text-[11px] text-slate-400">Support with $3, $5, or custom tip</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
            </a>

            {/* GitHub Sponsors */}
            <a
              href="https://github.com/sponsors/smurari229-ai"
              target="_blank"
              rel="noreferrer"
              className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Github className="w-5 h-5 text-slate-200" />
                <div>
                  <span className="font-semibold text-xs text-white block">GitHub Sponsors</span>
                  <span className="text-[11px] text-slate-400">Sponsor monthly with public badge on GitHub</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </a>

            {/* UPI / Direct */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-white block">Direct UPI (India)</span>
                <span className="text-[11px] text-slate-400 font-mono">smurari229@okaxis</span>
              </div>
              <button
                onClick={handleCopyUpi}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 font-medium transition-colors"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
