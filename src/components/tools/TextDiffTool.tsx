import React, { useMemo, useState } from 'react';
import { Columns2, AlignJustify, Copy, Check } from 'lucide-react';

type DiffLine = { type: 'same' | 'add' | 'remove'; text: string; oldLine?: number; newLine?: number };

function buildLineDiff(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const rows: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
  const result: DiffLine[] = []; let i = 0; let j = 0; let oldLine = 1; let newLine = 1;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { result.push({ type: 'same', text: a[i], oldLine, newLine }); i += 1; j += 1; oldLine += 1; newLine += 1; }
    else if (j < b.length && (i === a.length || rows[i][j + 1] >= rows[i + 1][j])) { result.push({ type: 'add', text: b[j], newLine }); j += 1; newLine += 1; }
    else { result.push({ type: 'remove', text: a[i], oldLine }); i += 1; oldLine += 1; }
  }
  return result;
}

export const TextDiffTool: React.FC = () => {
  const [original, setOriginal] = useState('// Original function\nfunction calculateTotal(price, quantity) {\n  return price * quantity;\n}');
  const [modified, setModified] = useState('// Updated function\nfunction calculateTotal(price, quantity, tax = 0) {\n  return price * quantity * (1 + tax);\n}');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [copied, setCopied] = useState(false);
  const diff = useMemo(() => buildLineDiff(original, modified), [original, modified]);
  const removed = diff.filter((x) => x.type === 'remove').length;
  const added = diff.filter((x) => x.type === 'add').length;
  const unifiedText = useMemo(() => diff.map((line) => (line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ') + line.text).join('\n'), [diff]);
  const copy = async () => { await navigator.clipboard.writeText(unifiedText); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('side-by-side')} className={'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ' + (viewMode === 'side-by-side' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800')}><Columns2 className="w-3.5 h-3.5" /> Side by Side</button>
          <button onClick={() => setViewMode('unified')} className={'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ' + (viewMode === 'unified' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800')}><AlignJustify className="w-3.5 h-3.5" /> Unified</button>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono"><span className="text-rose-400">-{removed}</span><span className="text-emerald-400">+{added}</span><button onClick={copy} className="text-indigo-400 flex items-center gap-1">{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied' : 'Copy diff'}</button></div>
      </div>
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5"><span className="text-xs font-semibold text-rose-400 px-1">Original</span><textarea value={original} onChange={(e) => setOriginal(e.target.value)} rows={14} spellCheck={false} className="w-full p-3 font-mono text-xs text-slate-200 bg-slate-950 rounded-2xl border border-slate-800 focus:border-rose-500 focus:outline-none resize-y" /></div>
          <div className="space-y-1.5"><span className="text-xs font-semibold text-emerald-400 px-1">Modified</span><textarea value={modified} onChange={(e) => setModified(e.target.value)} rows={14} spellCheck={false} className="w-full p-3 font-mono text-xs text-slate-200 bg-slate-950 rounded-2xl border border-slate-800 focus:border-emerald-500 focus:outline-none resize-y" /></div>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs overflow-auto">
          {diff.map((line, index) => <div key={line.type + '-' + index} className={'grid grid-cols-[5rem_1fr] gap-2 px-3 py-1 ' + (line.type === 'add' ? 'bg-emerald-950/30 text-emerald-300' : line.type === 'remove' ? 'bg-rose-950/30 text-rose-300' : 'text-slate-400')}><span className="select-none text-[10px] opacity-70">{(line.oldLine ?? '') + ':' + (line.newLine ?? '')}</span><span className="whitespace-pre">{(line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ') + line.text}</span></div>)}
        </div>
      )}
    </div>
  );
};