import React, { useMemo, useState } from 'react';
import { Copy, Check, ArrowRightLeft, AlertCircle, RotateCcw } from 'lucide-react';

type Mode = 'base64' | 'url' | 'html' | 'hex' | 'binary';
type Direction = 'encode' | 'decode';

interface Base64ConverterToolProps {
  toolId?: string;
}

const utf8ToBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const base64ToUtf8 = (value: string) => {
  const normalized = value.trim();
  if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error('Invalid Base64 input.');
  }
  const binary = atob(normalized);
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(binary, (char) => char.charCodeAt(0))
  );
};

const hexToText = (value: string) => {
  const clean = value.replace(/0x/gi, '').replace(/[\s,]+/g, '');
  if (!clean || clean.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(clean)) {
    throw new Error('Hex must contain an even number of hexadecimal digits.');
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(clean.match(/.{2}/g)!, (pair) => parseInt(pair, 16))
  );
};

const binaryToText = (value: string) => {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length || tokens.some((token) => !/^[01]{8}$/.test(token))) {
    throw new Error('Binary input must contain 8-bit groups separated by spaces.');
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(tokens, (token) => parseInt(token, 2))
  );
};

const htmlDecode = (value: string) => {
  const doc = new DOMParser().parseFromString(value, 'text/html');
  return doc.body.textContent ?? '';
};

const encodeHtmlEntities = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char] ?? char);

export const Base64ConverterTool: React.FC<Base64ConverterToolProps> = ({ toolId }) => {
  const initialMode: Mode =
    toolId === 'url-encoder-decoder' ? 'url' :
    toolId === 'html-entity-encoder' ? 'html' :
    toolId === 'hex-to-string' ? 'hex' :
    toolId === 'binary-to-text' ? 'binary' : 'base64';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [direction, setDirection] = useState<Direction>('encode');
  const [input, setInput] = useState('Hello, Coding Super Hub 2026! 🚀');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const output = useMemo(() => {
    if (!input) return '';
    try {
      if (mode === 'base64') return direction === 'encode' ? utf8ToBase64(input) : base64ToUtf8(input);
      if (mode === 'url') return direction === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input);
      if (mode === 'html') return direction === 'encode' ? encodeHtmlEntities(input) : htmlDecode(input);
      if (mode === 'hex') {
        if (direction === 'encode') return Array.from(new TextEncoder().encode(input)).map((b) => b.toString(16).padStart(2, '0')).join(' ');
        return hexToText(input);
      }
      if (direction === 'encode') return Array.from(new TextEncoder().encode(input)).map((b) => b.toString(2).padStart(8, '0')).join(' ');
      return binaryToText(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to convert input.');
      return '';
    }
  }, [direction, input, mode]);

  React.useEffect(() => {
    try {
      if (!input) setError(null);
      else {
        // Re-run validation without mutating the output.
        if (mode === 'base64' && direction === 'decode') base64ToUtf8(input);
        if (mode === 'url' && direction === 'decode') decodeURIComponent(input);
        if (mode === 'hex' && direction === 'decode') hexToText(input);
        if (mode === 'binary' && direction === 'decode') binaryToText(input);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid input.');
    }
  }, [direction, input, mode]);

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const swap = () => {
    if (!output || error) return;
    setInput(output);
    setDirection((value) => value === 'encode' ? 'decode' : 'encode');
  };

  const reset = () => {
    setDirection('encode');
    setInput('Hello, Coding Super Hub 2026! 🚀');
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {([
            ['base64', 'Base64'],
            ['url', 'URL Component'],
            ['html', 'HTML Entities'],
            ['hex', 'Hexadecimal'],
            ['binary', '8-bit Binary']
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setMode(id); setError(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${mode === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setDirection((value) => value === 'encode' ? 'decode' : 'encode'); setError(null); }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> {direction === 'encode' ? 'Encode' : 'Decode'}
          </button>
          <button onClick={swap} disabled={!output || !!error} className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs">
            Swap
          </button>
          <button onClick={reset} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300" aria-label="Reset converter">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Input</span><span>{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Converter input"
            spellCheck={false}
            className="w-full h-64 p-4 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Output</span>
            <button onClick={copy} disabled={!output} className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 flex items-center gap-1 font-medium">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            readOnly
            value={output}
            aria-label="Converter output"
            className="w-full h-64 p-4 font-mono text-xs text-emerald-300 bg-slate-950/90 rounded-2xl border border-slate-800 resize-y leading-relaxed"
          />
        </div>
      </div>

      {error ? (
        <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      ) : (
        <div className="text-[11px] text-emerald-400 px-1">Conversion is performed locally in your browser.</div>
      )}
    </div>
  );
};
