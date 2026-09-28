import React, { useState, useEffect, useRef } from 'react';
import { TOOLS_CATALOG } from '../data/tools-catalog';
import { ToolItem } from '../types/tools';
import { Search, X, Star, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: ToolItem) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTool,
  favorites,
  onToggleFavorite
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = query.trim()
    ? TOOLS_CATALOG.filter(t => 
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.description.toLowerCase().includes(query.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())) ||
        t.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 30)
    : TOOLS_CATALOG.filter(t => t.isPopular).slice(0, 15);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelectTool(filtered[selectedIndex]);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/90">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search 535 developer tools by name, tag, or category..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No developer tools found matching "{query}".
            </div>
          ) : (
            filtered.map((tool, idx) => {
              const isSelected = idx === selectedIndex;
              const isFav = favorites.includes(tool.id);

              return (
                <div
                  key={tool.id}
                  onClick={() => {
                    onSelectTool(tool);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/15 border border-indigo-500/30'
                      : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-300' : 'text-white'}`}>
                        {tool.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400 font-mono">
                        {tool.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {tool.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(tool.id);
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors"
                      title={isFav ? 'Remove favorite' : 'Add favorite'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to close</span>
          </div>
          <span>{filtered.length} of 535 tools</span>
        </div>
      </div>
    </div>
  );
};
