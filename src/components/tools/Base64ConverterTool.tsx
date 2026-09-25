import React, { useState } from 'react';
import { Copy, Check, ArrowRightLeft, AlertCircle } from 'lucide-react';

interface Base64ConverterToolProps {
  toolId?: string;
}

export const Base64ConverterTool: React.FC<Base64ConverterToolProps> = ({ toolId }) => {
  const [mode, setMode] = useState<'base64' | 'url' | 'html' | 'hex' | 'binary'>(
    toolId === 'url-encoder-decoder' ? 'url' :
    toolId === 'html-entity-encoder' ? 'html' :
    toolId === 'hex-to-string' ? 'hex' :
    toolId === 'binary-to-text' ? 'binary' : 'base64'
  );
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState<string>('Hello, Coding Super Hub 2026! 🚀');
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const calculateOutput = (): string => {
    try {
      if (!input) return '';
      if (mode === 'base64') {
        if (direction === 'encode') {
          return btoa(unescape(encodeURIComponent(input)));
        } else {
          return decodeURIComponent(escape(atob(input)));
        }
      }

      if (mode === 'url') {
        return direction === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input);
      }

      if (mode === 'html') {
        if (direction === 'encode') {
          return input.replace(/[\u00A0-\u9999<>\&]/g, (i) => '&#' + i.charCodeAt(0) + ';');
        } else {
          const doc = new DOMParser().parseFromString(input, 'text/html');
          return doc.documentElement.textContent || '';
        }
      }

      if (mode === 'hex') {
        if (direction === 'encode') {
          return Array.from(new TextEncoder().encode(input))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
        } else {
          const clean = input.replace(/\s+/g, '');
          const bytes = new Uint8Array(clean.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
          return new TextDecoder().decode(bytes);
        }
      }

      if (mode === 'binary') {
        if (direction === 'encode') {
          return Array.from(new TextEncoder().encode(input))
            .map(b => b.toString(2).padStart(8, '0'))
            .join(' ');
        } else {
          const clean = input.trim().split(/\s+/);
          const bytes = new Uint8Array(clean.map(b => parseInt(b, 2)));
          return new TextDecoder().decode(bytes);
        }
      }

      return '';
    } catch (err: any) {
      return `Error: ${err.message || 'Malformed input'}`;
    }
  };

  const output = calculateOutput();

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwap = () => {
    if (!output.startsWith('Error:')) {
      setInput(output);
      setDirection(direction === 'encode' ? 'decode' : 'encode');
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode & Direction Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'base64', label: 'Base64' },
            { id: 'url', label: 'URL Component' },
            { id: 'html', label: 'HTML Entities' },
            { id: 'hex', label: 'Hexadecimal' },
            { id: 'binary', label: '8-bit Binary' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                mode === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDirection(direction === 'encode' ? 'decode' : 'encode')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Mode: {direction === 'encode' ? 'Encode' : 'Decode'}</span>
          </button>
          <button
            onClick={handleSwap}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            title="Swap input and output"
          >
            Swap
          </button>
        </div>
      </div>

      {/* Input / Output Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Block */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Input ({direction === 'encode' ? 'Raw Text' : `${mode.toUpperCase()} String`})</span>
            <span>{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste input string here..."
            className="w-full h-64 p-4 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
          />
        </div>

        {/* Output Block */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Output ({direction === 'encode' ? `${mode.toUpperCase()} Encoded` : 'Decoded Text'})</span>
            <button
              onClick={handleCopy}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <textarea
            readOnly
            value={output}
            placeholder="Result will appear here..."
            className="w-full h-64 p-4 font-mono text-xs text-emerald-300 bg-slate-950/90 rounded-2xl border border-slate-800 focus:outline-none resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};
