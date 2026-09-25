import React, { useState } from 'react';
import { AFFILIATE_DEALS } from '../../data/affiliates';
import { AffiliateDeal } from '../../types/tools';
import { X, ExternalLink, Copy, Check, Search, Tag, Star, Sparkles } from 'lucide-react';

interface AffiliateHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AffiliateHubModal: React.FC<AffiliateHubModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ['All', 'Hosting & Cloud', 'AI & Copilots', 'Database & Backend', 'Dev Tools & IDEs', 'Security & Auth'];

  const filteredDeals = AFFILIATE_DEALS.filter(deal => {
    const matchesCat = selectedCategory === 'All' || deal.category === selectedCategory;
    const matchesQuery = deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.dealText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Recommended Developer Resources &amp; Deals
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Verified Free Credits &amp; Discounts
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Curated cloud services, AI engines, and developer tools with exclusive referral credits.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search partner deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Deals Grid */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredDeals.map((deal) => (
              <div
                key={deal.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block">
                        {deal.category}
                      </span>
                      <h3 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors">
                        {deal.name}
                      </h3>
                    </div>
                    {deal.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium whitespace-nowrap">
                        {deal.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {deal.description}
                  </p>
                </div>

                {/* Offer Highlight */}
                <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between text-xs">
                  <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {deal.dealText}
                  </span>
                  {deal.code && (
                    <button
                      onClick={() => handleCopyCode(deal.id, deal.code!)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] flex items-center gap-1 border border-slate-700"
                      title="Copy promo code"
                    >
                      {copiedId === deal.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === deal.id ? 'Copied!' : deal.code}</span>
                    </button>
                  )}
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{deal.rating.toFixed(1)}</span>
                  </div>
                  <a
                    href={deal.referralUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm shadow-indigo-600/20"
                  >
                    <span>Visit Partner</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <p>
            Transparency note: Links contain referral identifiers that support maintaining this 100% free tool.
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
