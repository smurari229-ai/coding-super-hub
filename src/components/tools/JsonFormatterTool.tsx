import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Download, AlertCircle, CheckCircle2, Minimize2, Maximize2, ArrowDownUp, RotateCcw } from 'lucide-react';

interface JsonFormatterToolProps {
  toolId?: string;
}

export const JsonFormatterTool: React.FC<JsonFormatterToolProps> = ({ toolId = 'json-formatter' }) => {
  const [input, setInput] = useState<string>(`{
  "project": "Coding Super Hub",
  "version": 2.5,
  "developer": "smurari229",
  "features": ["500+ Tools", "Zero-Latency", "Client-Side Privacy"],
  "settings": {
    "theme": "dark",
    "offline_ready": true
  }
}`);
  const [indent, setIndent] = useState<2 | 4>(2);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    try {
      return JSON.parse(input);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Invalid JSON syntax' };
    }
  }, [input]);

  const isValid = !('error' in parsed);

  const stats = useMemo(() => {
    if (!isValid) return null;
    let keys = 0;
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') {
        const object = value as Record<string, unknown>;
        keys += Object.keys(object).length;
        Object.values(object).forEach(walk);
      }
    };
    walk(parsed);
    const bytes = new TextEncoder().encode(input).byteLength;
    return { keys, bytes };
  }, [input, isValid, parsed]);

  useEffect(() => {
    setError(isValid ? null : (parsed as { error: string }).error);
  }, [isValid, parsed]);

  const transform = (mode: 'format' | 'minify' | 'sort') => {
    try {
      const value = JSON.parse(input);
      const sortKeys = (item: unknown): unknown => {
        if (Array.isArray(item)) return item.map(sortKeys);
        if (item && typeof item === 'object') {
          return Object.keys(item as Record<string, unknown>)
            .sort((a, b) => a.localeCompare(b))
            .reduce<Record<string, unknown>>((acc, key) => {
              acc[key] = sortKeys((item as Record<string, unknown>)[key]);
              return acc;
            }, {});
        }
        return item;
      };
      const next = mode === 'sort' ? sortKeys(value) : value;
      setInput(JSON.stringify(next, null, mode === 'minify' ? 0 : indent));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON syntax');
    }
  };

  const reset = () => {
    setInput(`{
  "project": "Coding Super Hub",
  "version": 2.5,
  "developer": "smurari229"
}`);
    setError(null);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(input);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const blob = new Blob([input], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'formatted.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const isMinifier = toolId === 'json-minifier';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => transform('format')} className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5" /> Format
          </button>
          <button onClick={() => transform('minify')} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5">
            <Minimize2 className="w-3.5 h-3.5" /> Minify
          </button>
          <button onClick={() => transform('sort')} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5">
            <ArrowDownUp className="w-3.5 h-3.5" /> Sort Keys
          </button>
          <select
            aria-label="JSON indentation"
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value) as 2 | 4)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={copy} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={download} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200" aria-label="Download JSON">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isMinifier && (
        <div className="text-[11px] text-slate-400 px-1">
          Minifier mode: use <strong className="text-slate-200">Minify</strong> to remove non-semantic whitespace.
        </div>
      )}

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        aria-label="JSON input"
        aria-invalid={!isValid}
        spellCheck={false}
        className="w-full min-h-80 p-4 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed shadow-inner"
        placeholder="Paste JSON here..."
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
        {isValid ? (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Valid JSON
          </div>
        ) : (
          <div className="flex items-start gap-1.5 text-rose-300">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="font-mono break-all">{error}</span>
          </div>
        )}
        {stats && (
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
            <span>Keys: {stats.keys}</span>
            <span>Bytes: {stats.bytes}</span>
          </div>
        )}
      </div>
    </div>
  );
};
