import React, { useMemo, useState } from 'react';
import { Copy, Check, RotateCcw } from 'lucide-react';

interface CaseConverterToolProps {
  toolId?: string;
}

export const CaseConverterTool: React.FC<CaseConverterToolProps> = ({ toolId }) => {
  const [input, setInput] = useState('Full Stack Developer Toolbox 2026');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const words = useMemo(() => input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.\/]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean), [input]);

  const cases = useMemo(() => [
    { id: 'camel', name: 'camelCase', value: words.map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join('') },
    { id: 'snake', name: 'snake_case', value: words.map(w => w.toLowerCase()).join('_') },
    { id: 'kebab', name: 'kebab-case', value: words.map(w => w.toLowerCase()).join('-') },
    { id: 'pascal', name: 'PascalCase', value: words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('') },
    { id: 'constant', name: 'CONSTANT_CASE', value: words.map(w => w.toUpperCase()).join('_') },
    { id: 'title', name: 'Title Case', value: words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ') },
    { id: 'sentence', name: 'Sentence case', value: input ? input[0].toUpperCase() + input.slice(1).toLowerCase() : '' },
    { id: 'dot', name: 'dot.case', value: words.map(w => w.toLowerCase()).join('.') },
    { id: 'path', name: 'path/case', value: words.map(w => w.toLowerCase()).join('/') },
    { id: 'slug', name: 'URL Slug', value: input.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') },
  ], [input, words]);

  const copy = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(id);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const reset = () => setInput(toolId === 'string-slugifier' ? 'Build a fast developer tool' : 'Full Stack Developer Toolbox 2026');

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">Input Text</label>
          <button onClick={reset} className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset example
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Text to convert"
          rows={3}
          className="w-full p-3 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
        />
      </div>

      {toolId === 'string-slugifier' ? (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-mono text-slate-500">SEO URL Slug</span>
              <p className="mt-1 font-mono text-sm text-emerald-300 break-all">{cases.find((c) => c.id === 'slug')?.value || '...'}</p>
            </div>
            <button onClick={() => copy('slug', cases.find((c) => c.id === 'slug')?.value || '')} className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white" aria-label="Copy slug">
              {copiedKey === 'slug' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cases.map((item) => (
            <div key={item.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">{item.name}</span>
                <p className="font-mono text-xs text-white truncate select-all">{item.value || '...'}</p>
              </div>
              <button onClick={() => copy(item.id, item.value)} className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white shrink-0" aria-label={`Copy ${item.name}`}>
                {copiedKey === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
