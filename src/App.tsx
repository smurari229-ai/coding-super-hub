import React, { useState, useEffect } from 'react';
import { TOOLS_CATALOG, CATEGORIES } from './data/tools-catalog';
import { ToolCategory, ToolItem } from './types/tools';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SearchModal } from './components/SearchModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { AffiliateHubModal } from './components/Monetization/AffiliateHubModal';
import { ProUpgradeModal } from './components/Monetization/ProUpgradeModal';
import { SponsorModal } from './components/Monetization/SponsorModal';
import { TransparencyModal } from './components/Monetization/TransparencyModal';

// Dedicated Tool Components
import { JsonFormatterTool } from './components/tools/JsonFormatterTool';
import { Base64ConverterTool } from './components/tools/Base64ConverterTool';
import { CaseConverterTool } from './components/tools/CaseConverterTool';
import { UuidGeneratorTool } from './components/tools/UuidGeneratorTool';
import { HashCryptoTool } from './components/tools/HashCryptoTool';
import { RegexTesterTool } from './components/tools/RegexTesterTool';
import { TextDiffTool } from './components/tools/TextDiffTool';
import { JwtDecoderTool } from './components/tools/JwtDecoderTool';
import { MarkdownEditorTool } from './components/tools/MarkdownEditorTool';
import { ColorPaletteTool } from './components/tools/ColorPaletteTool';
import { CssShadowGeneratorTool } from './components/tools/CssShadowGeneratorTool';
import { HtmlMetaGeneratorTool } from './components/tools/HtmlMetaGeneratorTool';
import { DataConverterTool } from './components/tools/DataConverterTool';
import { TimestampConverterTool } from './components/tools/TimestampConverterTool';
import { QrCodeGeneratorTool } from './components/tools/QrCodeGeneratorTool';
import { HttpStatusExplorerTool } from './components/tools/HttpStatusExplorerTool';
import { GitIgnoreGeneratorTool } from './components/tools/GitIgnoreGeneratorTool';
import { DevCalculatorsTool } from './components/tools/DevCalculatorsTool';
import { CodePlaygroundTool } from './components/tools/CodePlaygroundTool';
import { AiCopilotTool } from './components/tools/AiCopilotTool';
import { GenericToolRunner } from './components/tools/GenericToolRunner';
import { Phase1LayoutTools } from './components/tools/Phase1LayoutTools';
import { Phase1SecurityTools } from './components/tools/Phase1SecurityTools';

import { 
  Star, 
  Share2, 
  Sparkles, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  Terminal,
  Grid,
  Search,
  Zap,
  Tag
} from 'lucide-react';

export default function App() {
  const [selectedTool, setSelectedTool] = useState<ToolItem>(TOOLS_CATALOG[0]); // JSON Formatter
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('csh_favorites');
      return saved ? JSON.parse(saved) : ['json-formatter', 'uuid-generator', 'html-css-js-playground', 'sha256-hash'];
    } catch {
      return ['json-formatter', 'uuid-generator'];
    }
  });

  const [recentTools, setRecentTools] = useState<ToolItem[]>(() => {
    try {
      const saved = localStorage.getItem('csh_recents');
      return saved ? JSON.parse(saved) : [TOOLS_CATALOG[0]];
    } catch {
      return [TOOLS_CATALOG[0]];
    }
  });

  // Modal States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAffiliateOpen, setIsAffiliateOpen] = useState(false);
  const [isProOpen, setIsProOpen] = useState(false);
  const [isSponsorOpen, setIsSponsorOpen] = useState(false);
  const [isTransparencyOpen, setIsTransparencyOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Sync favorites
  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem('csh_favorites', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Switch active tool & track history
  const handleSelectTool = (tool: ToolItem) => {
    setSelectedTool(tool);
    setRecentTools(prev => {
      const filtered = prev.filter(t => t.id !== tool.id);
      const next = [tool, ...filtered].slice(0, 10);
      try { localStorage.setItem('csh_recents', JSON.stringify(next)); } catch {}
      return next;
    });
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === '?' && !isInputActive) {
        e.preventDefault();
        setIsShortcutsOpen(true);
      } else if (e.key.toLowerCase() === 'p' && !isInputActive) {
        const playgroundTool = TOOLS_CATALOG.find(t => t.id === 'html-css-js-playground');
        if (playgroundTool) handleSelectTool(playgroundTool);
      } else if (e.key.toLowerCase() === 'c' && !isInputActive) {
        const copilotTool = TOOLS_CATALOG.find(t => t.id === 'ai-code-copilot');
        if (copilotTool) handleSelectTool(copilotTool);
      } else if (e.key.toLowerCase() === 'd' && !isInputActive) {
        setIsAffiliateOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter tools for the bottom directory grid
  const currentDirectoryTools = TOOLS_CATALOG.filter(t => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'favorites') return favorites.includes(t.id);
    return t.category === selectedCategory;
  });

  const handleShareTool = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Render the appropriate execution runner
  const renderToolComponent = () => {
    if (selectedTool.id === 'css-flexbox-playground' || selectedTool.id === 'css-grid-generator') {
      return <Phase1LayoutTools tool={selectedTool} />;
    }

    const phase1SecurityIds = [
      'csp-generator',
      'security-headers-analyzer',
      'password-entropy-meter',
      'hash-identifier',
      'cookie-flags-generator',
      'rate-limit-header-builder',
      'url-parser-inspector',
      'json-schema-generator',
    ];

    if (phase1SecurityIds.includes(selectedTool.id)) {
      return <Phase1SecurityTools tool={selectedTool} />;
    }

    switch (selectedTool.dedicatedComponent) {
      case 'JsonFormatterTool':
        return <JsonFormatterTool toolId={selectedTool.id} />;
      case 'Base64ConverterTool':
        return <Base64ConverterTool toolId={selectedTool.id} />;
      case 'CaseConverterTool':
        return <CaseConverterTool />;
      case 'UuidGeneratorTool':
        return <UuidGeneratorTool />;
      case 'HashCryptoTool':
        return <HashCryptoTool />;
      case 'RegexTesterTool':
        return <RegexTesterTool />;
      case 'TextDiffTool':
        return <TextDiffTool />;
      case 'JwtDecoderTool':
        return <JwtDecoderTool />;
      case 'MarkdownEditorTool':
        return <MarkdownEditorTool />;
      case 'ColorPaletteTool':
        return <ColorPaletteTool />;
      case 'CssShadowGeneratorTool':
        return <CssShadowGeneratorTool />;
      case 'HtmlMetaGeneratorTool':
        return <HtmlMetaGeneratorTool />;
      case 'DataConverterTool':
        return <DataConverterTool toolId={selectedTool.id} />;
      case 'TimestampConverterTool':
        return <TimestampConverterTool />;
      case 'QrCodeGeneratorTool':
        return <QrCodeGeneratorTool />;
      case 'HttpStatusExplorerTool':
        return <HttpStatusExplorerTool />;
      case 'GitIgnoreGeneratorTool':
        return <GitIgnoreGeneratorTool />;
      case 'DevCalculatorsTool':
        return <DevCalculatorsTool toolId={selectedTool.id} />;
      case 'CodePlaygroundTool':
        return <CodePlaygroundTool />;
      case 'AiCopilotTool':
        return <AiCopilotTool />;
      default:
        return (
          <GenericToolRunner
            tool={selectedTool}
            onOpenAiCopilot={(code) => {
              const copilot = TOOLS_CATALOG.find(t => t.id === 'ai-code-copilot');
              if (copilot) handleSelectTool(copilot);
            }}
          />
        );
    }
  };

  const isFavorited = favorites.includes(selectedTool.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Global Top Navbar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenPlayground={() => {
          const t = TOOLS_CATALOG.find(x => x.id === 'html-css-js-playground');
          if (t) handleSelectTool(t);
        }}
        onOpenAiCopilot={() => {
          const t = TOOLS_CATALOG.find(x => x.id === 'ai-code-copilot');
          if (t) handleSelectTool(t);
        }}
        onOpenAffiliates={() => setIsAffiliateOpen(true)}
        onOpenPro={() => setIsProOpen(true)}
        onOpenSponsor={() => setIsSponsorOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
      />

      {/* Main Body Layout (Sidebar + Content Workspace) */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar & Mobile Drawer */}
        <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block fixed md:static inset-0 z-30 bg-slate-950/80 md:bg-transparent`}>
          <div className="h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setIsSidebarOpen(false);
              }}
              favorites={favorites}
              recentTools={recentTools}
              onSelectTool={handleSelectTool}
              onOpenAffiliates={() => setIsAffiliateOpen(true)}
              onOpenTransparency={() => setIsTransparencyOpen(true)}
              onOpenPro={() => setIsProOpen(true)}
              onOpenSponsor={() => setIsSponsorOpen(true)}
            />
          </div>
        </div>

        {/* Central Execution Workspace */}
        <main className="flex-1 p-4 md:p-8 space-y-8 min-w-0">
          
          {/* Active Tool Viewport */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 md:p-7 shadow-xl space-y-6">
            
            {/* Tool Header & Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                    {selectedTool.category}
                  </span>
                  {selectedTool.isPopular && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                      Popular
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-mono">
                    id: {selectedTool.id}
                  </span>
                </div>

                <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                  {selectedTool.name}
                </h1>
                <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
                  {selectedTool.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={() => toggleFavorite(selectedTool.id)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isFavorited
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title={isFavorited ? 'Remove from favorites' : 'Star this tool'}
                >
                  <Star className={`w-4 h-4 ${isFavorited ? 'fill-amber-400' : ''}`} />
                  <span className="hidden sm:inline">{isFavorited ? 'Starred' : 'Favorite'}</span>
                </button>

                <button
                  onClick={handleShareTool}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Share tool URL"
                >
                  {shareCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">{shareCopied ? 'Link Copied' : 'Share'}</span>
                </button>
              </div>
            </div>

            {/* Live Interactive Engine Component */}
            <div className="pt-2">
              {renderToolComponent()}
            </div>
          </section>

          {/* Directory Explorer (500+ Tools) */}
          <section className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Grid className="w-5 h-5 text-indigo-400" />
                  <span>
                    {selectedCategory === 'all' ? 'All Developer Tools' :
                     selectedCategory === 'favorites' ? 'Starred Favorites' :
                     CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Tools'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {currentDirectoryTools.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Click any card to launch it instantly in the workspace above</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-2 transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>Filter {currentDirectoryTools.length} tools...</span>
                </button>
              </div>
            </div>

            {/* Grid of Tools */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentDirectoryTools.slice(0, 48).map((tool) => {
                const isActive = tool.id === selectedTool.id;
                const isFav = favorites.includes(tool.id);

                return (
                  <div
                    key={tool.id}
                    onClick={() => handleSelectTool(tool)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between space-y-2 ${
                      isActive
                        ? 'bg-indigo-600/10 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`font-semibold text-xs transition-colors ${isActive ? 'text-indigo-400 font-bold' : 'text-white group-hover:text-indigo-300'}`}>
                          {tool.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(tool.id);
                          }}
                          className="text-slate-500 hover:text-amber-400 p-0.5"
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'text-amber-400 fill-amber-400' : ''}`} />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {tool.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                      <span>{tool.category}</span>
                      {tool.isPopular && <span className="text-amber-400">★ Popular</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {currentDirectoryTools.length > 48 && (
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
                Showing top 48 of {currentDirectoryTools.length} tools. Use <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono border border-slate-800">⌘K</kbd> to search all 535 tools instantly.
              </div>
            )}
          </section>

        </main>
      </div>

      {/* Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTool={handleSelectTool}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <AffiliateHubModal
        isOpen={isAffiliateOpen}
        onClose={() => setIsAffiliateOpen(false)}
      />

      <ProUpgradeModal
        isOpen={isProOpen}
        onClose={() => setIsProOpen(false)}
      />

      <SponsorModal
        isOpen={isSponsorOpen}
        onClose={() => setIsSponsorOpen(false)}
      />

      <TransparencyModal
        isOpen={isTransparencyOpen}
        onClose={() => setIsTransparencyOpen(false)}
      />
    </div>
  );
}
