import React, { useState } from 'react';
import { Copy, Check, Type, Sparkles } from 'lucide-react';

export const CaseConverterTool: React.FC = () => {
  const [input, setInput] = useState<string>('Full Stack Developer Toolbox 2026');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const words = input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-.\/]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const cases = [
    {
      id: 'camel',
      name: 'camelCase',
      value: words
        .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('')
    },
    {
      id: 'snake',
      name: 'snake_case',
      value: words.map(w => w.toLowerCase()).join('_')
    },
    {
      id: 'kebab',
      name: 'kebab-case',
      value: words.map(w => w.toLowerCase()).join('-')
    },
    {
      id: 'pascal',
      name: 'PascalCase',
      value: words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')
    },
    {
      id: 'constant',
      name: 'CONSTANT_CASE',
      value: words.map(w => w.toUpperCase()).join('_')
    },
    {
      id: 'title',
      name: 'Title Case',
      value: words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    },
    {
      id: 'sentence',
      name: 'Sentence case',
      value: input.charAt(0).toUpperCase() + input.slice(1).toLowerCase()
    },
    {
      id: 'dot',
      name: 'dot.case',
      value: words.map(w => w.toLowerCase()).join('.')
    },
    {
      id: 'path',
      name: 'path/case',
      value: words.map(w => w.toLowerCase()).join('/')
    },
    {
      id: 'slug',
      name: 'URL Slug',
      value: input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
    }
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Input Text to Convert</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste any text or variable name..."
          rows={3}
          className="w-full p-3 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
        />
      </div>

      {/* Case Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cases.map((c) => (
          <div
            key={c.id}
            className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3 group"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                {c.name}
              </span>
              <p className="font-mono text-xs text-white truncate selection:bg-indigo-500">
                {c.value || '...'}
              </p>
            </div>
            <button
              onClick={() => handleCopy(c.id, c.value)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all shrink-0"
              title={`Copy ${c.name}`}
            >
              {copiedKey === c.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
