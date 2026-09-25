import React from 'react';
import { 
  Search, 
  Terminal, 
  Sparkles, 
  Zap, 
  Heart, 
  HelpCircle, 
  Moon, 
  Sun, 
  Tag, 
  Layers, 
  Menu 
} from 'lucide-react';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenPlayground: () => void;
  onOpenAiCopilot: () => void;
  onOpenAffiliates: () => void;
  onOpenPro: () => void;
  onOpenSponsor: () => void;
  onOpenShortcuts: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenPlayground,
  onOpenAiCopilot,
  onOpenAffiliates,
  onOpenPro,
  onOpenSponsor,
  onOpenShortcuts,
  onToggleSidebar
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Mobile Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800"
            title="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-md shadow-indigo-500/20">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white tracking-tight">Coding Super Hub</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">500+ Developer Utilities &amp; Sandboxes</p>
            </div>
          </div>
        </div>

        {/* Center: Search Trigger (Cmd+K) */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 transition-all shadow-inner group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              <span>Search 500+ developer tools...</span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-400 border border-slate-800">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile search button */}
          <button
            onClick={onOpenSearch}
            className="sm:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Sandbox Button */}
          <button
            onClick={onOpenPlayground}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sandbox</span>
          </button>

          {/* AI Copilot Button */}
          <button
            onClick={onOpenAiCopilot}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-300 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Copilot</span>
          </button>

          {/* Deals & Affiliates */}
          <button
            onClick={onOpenAffiliates}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Dev Deals</span>
          </button>

          {/* Sponsor / Heart */}
          <button
            onClick={onOpenSponsor}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 transition-colors"
            title="Support Creator"
          >
            <Heart className="w-4 h-4" />
          </button>

          {/* Go Pro Button */}
          <button
            onClick={onOpenPro}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Go Pro</span>
          </button>

          {/* Shortcuts Help */}
          <button
            onClick={onOpenShortcuts}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Keyboard shortcuts (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
