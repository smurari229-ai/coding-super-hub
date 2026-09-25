import React, { useState } from 'react';
import { Copy, Check, Download, AlertCircle, CheckCircle2, Minimize2, Maximize2, ArrowDownUp } from 'lucide-react';

interface JsonFormatterToolProps {
  toolId: string;
}

export const JsonFormatterTool: React.FC<JsonFormatterToolProps> = ({ toolId }) => {
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
  const [indent, setIndent] = useState<number>(2);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ keys: number; size: string } | null>(null);

  const formatJson = (tabSize: number = indent) => {
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, tabSize);
      setInput(formatted);
      setError(null);
      countStats(parsed);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON syntax');
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
      setError(null);
      countStats(parsed);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON syntax');
    }
  };

  const sortKeys = () => {
    try {
      const parsed = JSON.parse(input);
      const sortObj = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(sortObj);
        if (obj !== null && typeof obj === 'object') {
          return Object.keys(obj)
            .sort()
            .reduce((acc: any, key) => {
              acc[key] = sortObj(obj[key]);
              return acc;
            }, {});
        }
        return obj;
      };
      const sorted = sortObj(parsed);
      setInput(JSON.stringify(sorted, null, indent));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON syntax');
    }
  };

  const countStats = (obj: any) => {
    let keyCount = 0;
    const walk = (item: any) => {
      if (item && typeof item === 'object') {
        if (!Array.isArray(item)) keyCount += Object.keys(item).length;
        Object.values(item).forEach(walk);
      }
    };
    walk(obj);
    const bytes = new Blob([input]).size;
    setStats({
      keys: keyCount,
      size: bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} Bytes`
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([input], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => formatJson(2)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Format (2 spaces)</span>
          </button>
          <button
            onClick={() => formatJson(4)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <span>Format (4 spaces)</span>
          </button>
          <button
            onClick={minifyJson}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Minify</span>
          </button>
          <button
            onClick={sortKeys}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Sort object keys alphabetically"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span>Sort Keys</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Download .json file"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Viewport */}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
          }}
          placeholder="Paste or write your JSON here..."
          className="w-full h-80 p-4 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed shadow-inner"
          spellCheck={false}
        />
      </div>

      {/* Status & Validation Message */}
      {error ? (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-mono">{error}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Valid JSON Syntax</span>
          </div>
          {stats && (
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
              <span>Keys: {stats.keys}</span>
              <span>Size: {stats.size}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
