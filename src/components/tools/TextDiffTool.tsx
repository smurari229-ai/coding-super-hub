import React, { useState } from 'react';
import { GitCompare, Columns2, AlignJustify, Sparkles } from 'lucide-react';

export const TextDiffTool: React.FC = () => {
  const [original, setOriginal] = useState<string>(`// Original function
function calculateTotal(price, quantity) {
  const subtotal = price * quantity;
  return subtotal;
}`);

  const [modified, setModified] = useState<string>(`// Upgraded with tax & discount calculation
function calculateTotal(price, quantity, discount = 0, taxRate = 0.08) {
  const subtotal = (price * quantity) * (1 - discount);
  const tax = subtotal * taxRate;
  return subtotal + tax;
}`);

  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');

  // Simple clean line diff algorithm
  const origLines = original.split('\n');
  const modLines = modified.split('\n');

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Side by Side</span>
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'unified'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <AlignJustify className="w-3.5 h-3.5" />
            <span>Unified View</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          <span className="text-rose-400">-{origLines.length} lines</span>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-emerald-400">+{modLines.length} lines</span>
        </div>
      </div>

      {/* Editor / Diff View */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-rose-400 block px-1">Original Text (Before)</span>
            <textarea
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              rows={12}
              className="w-full p-3 font-mono text-xs text-slate-200 bg-slate-950 rounded-2xl border border-rose-950/60 focus:outline-none focus:border-rose-500 leading-relaxed shadow-inner"
              spellCheck={false}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-emerald-400 block px-1">Modified Text (After)</span>
            <textarea
              value={modified}
              onChange={(e) => setModified(e.target.value)}
              rows={12}
              className="w-full p-3 font-mono text-xs text-slate-200 bg-slate-950 rounded-2xl border border-emerald-950/60 focus:outline-none focus:border-emerald-500 leading-relaxed shadow-inner"
              spellCheck={false}
            />
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1 overflow-x-auto">
          {origLines.map((line, idx) => (
            <div key={`orig-${idx}`} className="flex items-center gap-3 py-0.5 px-2 rounded bg-rose-950/20 text-rose-300">
              <span className="text-rose-500 w-6 select-none font-mono text-[10px]">- {idx + 1}</span>
              <span className="whitespace-pre">{line}</span>
            </div>
          ))}
          {modLines.map((line, idx) => (
            <div key={`mod-${idx}`} className="flex items-center gap-3 py-0.5 px-2 rounded bg-emerald-950/20 text-emerald-300">
              <span className="text-emerald-500 w-6 select-none font-mono text-[10px]">+ {idx + 1}</span>
              <span className="whitespace-pre">{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
