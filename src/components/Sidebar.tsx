import React from 'react';
import { CATEGORIES } from '../data/tools-catalog';
import { ToolCategory, ToolItem } from '../types/tools';
import { AdBanner } from './Monetization/AdBanner';
import {
  Type, Shield, Layout, Database, Server, Calculator, Code2, Sparkles,
  Star, Clock, ShieldCheck, Tag
} from 'lucide-react';

interface SidebarProps {
  selectedCategory: ToolCategory | 'all' | 'favorites';
  onSelectCategory: (cat: ToolCategory | 'all' | 'favorites') => void;
  favorites: string[];
  recentTools: ToolItem[];
  onSelectTool: (tool: ToolItem) => void;
  onOpenAffiliates: () => void;
  onOpenTransparency: () => void;
  onOpenPro: () => void;
  onOpenSponsor: () => void;
  isPro?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  favorites,
  recentTools,
  onSelectTool,
  onOpenAffiliates,
  onOpenTransparency,
  onOpenPro,
  onOpenSponsor,
  isPro = false
}) => {
  const getCategoryIcon = (id: ToolCategory) => {
    switch (id) {
      case 'text-string': return <Type className="w-4 h-4 text-indigo-400" />;
      case 'crypto-security': return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'web-frontend': return <Layout className="w-4 h-4 text-amber-400" />;
      case 'data-formats': return <Database className="w-4 h-4 text-cyan-400" />;
      case 'devops-network': return <Server className="w-4 h-4 text-rose-400" />;
      case 'math-algorithms': return <Calculator className="w-4 h-4 text-violet-400" />;
      case 'code-snippets': return <Code2 className="w-4 h-4 text-blue-400" />;
      case 'misc-productivity': return <Sparkles className="w-4 h-4 text-orange-400" />;
    }
  };

  return (
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between overflow-y-auto space-y-6 h-[calc(100vh-4rem)] sticky top-16 scrollbar-none">
      <div className="space-y-5">
        <div className="space-y-1">
          <button
            onClick={() => onSelectCategory('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5"><Sparkles className="w-4 h-4" /><span>All 535 Developer Tools</span></div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20">535</span>
          </button>

          <button
            onClick={() => onSelectCategory('favorites')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === 'favorites'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5"><Star className="w-4 h-4 text-amber-400" /><span>Starred Favorites</span></div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20">{favorites.length}</span>
          </button>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold px-2 block mb-1">
            Tool Categories
          </span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">{getCategoryIcon(cat.id)}<span>{cat.name}</span></div>
                <span className="text-[10px] font-mono text-slate-500">{cat.count}</span>
              </button>
            );
          })}
        </div>

        {recentTools.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold px-2 block mb-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Recent History
            </span>
            {recentTools.slice(0, 5).map((tool) => (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-900 truncate transition-colors block"
              >
                {tool.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-800/80">
        {!isPro && (
          <AdBanner
            onOpenAffiliates={onOpenAffiliates}
            onOpenPro={onOpenPro}
            onOpenSponsor={onOpenSponsor}
            isPro={isPro}
          />
        )}

        <div className="space-y-1 text-[11px] text-slate-500 px-1">
          <button
            onClick={onOpenTransparency}
            className="flex items-center gap-1.5 hover:text-slate-300 transition-colors w-full text-left py-0.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Monetization &amp; Privacy Policy</span>
          </button>

          {!isPro && (
            <button
              onClick={onOpenAffiliates}
              className="flex items-center gap-1.5 hover:text-slate-300 transition-colors w-full text-left py-0.5"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recommended Cloud &amp; AI VPS</span>
            </button>
          )}

          {isPro && (
            <div className="px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              Pro active — ads hidden
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
