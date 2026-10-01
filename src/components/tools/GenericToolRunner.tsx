import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Play, RefreshCw, Sparkles } from 'lucide-react';
import { ToolItem } from '../../types/tools';
import { defaultInput, executeTool } from '../../lib/tool-engine';

interface GenericToolRunnerProps {
  tool: ToolItem;
  onOpenAiCopilot: (code: string) => void;
}

const MAX_OUTPUT_LENGTH = 50_000;

const contains = (tool: ToolItem, ...terms: string[]) => {
  const haystack = [tool.id, tool.name, tool.description, ...tool.tags, tool.category].join(' ').toLowerCase();
  return terms.some(term => haystack.includes(term.toLowerCase()));
};

const categoryFallback = async (tool: ToolItem, input: string): Promise<string | null> => {
  const id = tool.id.toLowerCase();
  const text = input.trim();

  // Text & String: common transforms that are safe to run entirely in the browser.
  if (contains(tool, 'case', 'camel', 'snake', 'kebab', 'pascal')) {
    const words = text.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_\\-./]+/g, ' ').trim().split(/\\s+/).filter(Boolean);
    if (id.includes('camel')) return words.map((w,i) => i ? w.charAt(0).toUpperCase()+w.slice(1).toLowerCase() : w.toLowerCase()).join('');
    if (id.includes('pascal')) return words.map(w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join('');
    if (id.includes('snake')) return words.map(w => w.toLowerCase()).join('_');
    if (id.includes('kebab')) return words.map(w => w.toLowerCase()).join('-');
    if (id.includes('constant')) return words.map(w => w.toUpperCase()).join('_');
    if (id.includes('title')) return words.map(w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
    return text;
  }

  if (contains(tool, 'base64')) {
    if (id.includes('decode')) {
      const binary = atob(text);
      return new TextDecoder().decode(Uint8Array.from(binary, ch => ch.charCodeAt(0)));
    }
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  if (contains(tool, 'url', 'uri') && (id.includes('encode') || id.includes('decode'))) {
    return id.includes('decode') ? decodeURIComponent(text) : encodeURIComponent(text);
  }

  if (contains(tool, 'html', 'entity') && (id.includes('encode') || id.includes('escape') || id.includes('decode') || id.includes('unescape'))) {
    if (id.includes('decode') || id.includes('unescape')) {
      return text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
    }
    return text.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch] ?? ch));
  }

  if (contains(tool, 'json') && (id.includes('format') || id.includes('prett') || id.includes('minif') || id.includes('validator'))) {
    const parsed = JSON.parse(text);
    return id.includes('minif') ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
  }

  if (contains(tool, 'regex', 'regexp') && (id.includes('test') || id.includes('tester'))) {
    const lines = text.split(/\\r?\\n/);
    const pattern = lines.shift()?.trim() ?? '';
    const match = pattern.match(/^/(.*)/([dgimsuvy]*)$/);
    if (!match) throw new Error('Regex fallback format: first line /pattern/flags, remaining lines are test text.');
    const re = new RegExp(match[1], match[2]);
    const body = lines.join('\\n');
    return JSON.stringify(Array.from(body.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags+'g')).map(m => ({match:m[0], index:m.index, groups:m.groups ?? null}))), null, 2);
  }

  if (contains(tool, 'statistics', 'word counter', 'word count', 'character count')) {
    const words = text.match(/[\\p{L}\\p{N}]+/gu) ?? [];
    const sentences = text.split(/[.!?]+/).filter(Boolean).length;
    return ['Characters: '+text.length, 'Characters (no spaces): '+text.replace(/\\s/g,'').length, 'Words: '+words.length, 'Lines: '+(text ? text.split(/\\r?\\n/).length : 0), 'Sentences: '+sentences].join('\\n');
  }

  if (contains(tool, 'timestamp', 'unix')) {
    const n = Number(text);
    if (/^-?\\d{9,13}$/.test(text)) {
      const ms = text.length === 10 ? n * 1000 : n;
      return new Date(ms).toISOString();
    }
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) throw new Error('Enter an ISO date or Unix timestamp.');
    return ['ISO: '+date.toISOString(), 'Unix seconds: '+Math.floor(date.getTime()/1000), 'Unix milliseconds: '+date.getTime()].join('\\n');
  }

  if (contains(tool, 'percentage', 'percent')) {
    const n = text.match(/-?\\d+(?:\\.\\d+)?/g)?.map(Number) ?? [];
    if (n.length < 2) throw new Error('Enter two numbers, e.g. 20 150.');
    return ['X% of Y: '+(n[0]*n[1]/100), 'X as % of Y: '+(n[1] ? (n[0]/n[1]*100).toFixed(2)+'%' : 'N/A'), 'Change X→Y: '+(n[0] ? ((n[1]-n[0])/Math.abs(n[0])*100).toFixed(2)+'%' : 'N/A')].join('\\n');
  }

  if (contains(tool, 'byte', 'bytes') && (contains(tool, 'converter', 'convert'))) {
    const n = Number(text.match(/-?\\d+(?:\\.\\d+)?/)?.[0]);
    if (!Number.isFinite(n)) throw new Error('Enter a numeric byte value.');
    return ['Bytes: '+n, 'KiB: '+(n/1024), 'MiB: '+(n/1024**2), 'GiB: '+(n/1024**3)].join('\\n');
  }

  if (contains(tool, 'password', 'strength')) {
    const score = [text.length >= 12, /[a-z]/.test(text), /[A-Z]/.test(text), /\\d/.test(text), /[^A-Za-z0-9]/.test(text)].filter(Boolean).length;
    return ['Length: '+text.length, 'Score: '+score+'/5', 'Rating: '+(score>=4?'Strong':score===3?'Fair':score>=2?'Weak':'Very weak')].join('\\n');
  }

  if (contains(tool, 'uuid') && (id.includes('generator') || id.includes('uuid'))) {
    return crypto.randomUUID();
  }

  if (contains(tool, 'sha-256', 'sha256', 'hash')) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
  }

  // DevOps / Network: deterministic local calculations and safe generators.
  if (contains(tool, 'chmod')) {
    const mode = text.replace(/^chmod\\s+/,'');
    if (!/^[0-7]{3,4}$/.test(mode)) throw new Error('Enter a chmod value such as 755.');
    const m = mode.slice(-3);
    const labels = ['---','--x','-w-','-wx','r--','r-x','rw-','rwx'];
    return ['Owner: '+labels[Number(m[0])], 'Group: '+labels[Number(m[1])], 'Others: '+labels[Number(m[2])], 'Command: chmod '+m+' path'].join('\\n');
  }

  if (contains(tool, 'cidr', 'subnet')) {
    const match = text.match(/^(\\d{1,3}(?:\\.\\d{1,3}){3})\\/(\\d{1,2})$/);
    if (!match) throw new Error('Enter IPv4 CIDR such as 192.168.1.0/24.');
    const octets = match[1].split('.').map(Number), prefix = Number(match[2]);
    if (octets.some(n=>n>255) || prefix>32) throw new Error('Invalid IPv4 CIDR.');
    const ip = (((octets[0]<<24)>>>0)+(octets[1]<<16)+(octets[2]<<8)+octets[3])>>>0;
    const mask = prefix===0 ? 0 : (0xffffffff << (32-prefix))>>>0;
    const network = (ip & mask)>>>0, broadcast = (network | (~mask>>>0))>>>0;
    const fmt = (n:number)=>[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
    const total = 2**(32-prefix);
    return ['Network: '+fmt(network),'Broadcast: '+fmt(broadcast),'Mask: '+fmt(mask),'Addresses: '+total,'Usable hosts: '+(prefix>=31?total:Math.max(0,total-2))].join('\\n');
  }

  // Web / Frontend: useful starter generators, never pretend to validate external services.
  if (contains(tool, 'meta tag', 'html meta', 'open graph', 'og tag')) {
    const title = text || 'My Website';
    return '<meta name="description" content="'+title.replace(/"/g,'&quot;')+'">\\n<meta property="og:title" content="'+title.replace(/"/g,'&quot;')+'">\\n<meta property="og:type" content="website">';
  }

  if (contains(tool, 'css minif', 'css compressor')) {
    return text.replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').replace(/\\s+/g,' ').replace(/\\s*([{}:;,>])\\s*/g,'$1').replace(/;}/g,'}').trim();
  }

  return null;
};

export const GenericToolRunner: React.FC<GenericToolRunnerProps> = ({ tool, onOpenAiCopilot }) => {
  const initialInput = useMemo(() => defaultInput(tool), [tool]);
  const [input, setInput] = useState(initialInput);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // GenericToolRunner intentionally stays UI-focused: the shared tool engine does the
  // heavy lifting. This wrapper is ID/category aware so future fallback handlers can
  // be added here without disturbing dedicated components or the existing engine.
  const handleExecute = async (value = input) => {
    const result = executeTool(tool, value);
    let finalOutput = result.output;
    let finalError = result.error ?? '';

    // The shared engine is authoritative. Only when it explicitly reports an
    // unimplemented catalog entry do we try the small category-aware fallback set.
    if (!finalOutput && finalError.startsWith('Coming soon')) {
      try {
        const fallback = await categoryFallback(tool, value);
        if (fallback !== null) {
          finalOutput = fallback;
          finalError = '';
        }
      } catch (error) {
        finalError = error instanceof Error ? error.message : 'Unable to process input.';
      }
    }

    const boundedOutput = finalOutput.length > MAX_OUTPUT_LENGTH
      ? finalOutput.slice(0, MAX_OUTPUT_LENGTH) + '\\n\\n[Output truncated at the 50,000 character safety limit.]'
      : finalOutput;
    setOutput(boundedOutput);
    setError(finalError);
  };

  useEffect(() => {
    setInput(initialInput);
    handleExecute(initialInput);
  }, [tool.id, initialInput]);

  const copyOutput = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access was blocked by the browser.');
    }
  };

  const downloadOutput = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = tool.id + '-output.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setInput(initialInput);
    handleExecute(initialInput);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => handleExecute()} aria-label="Process tool input" className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Process</span>
          </button>
          <button onClick={reset} aria-label="Reset tool input" className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => onOpenAiCopilot(input)} aria-label="Open AI Copilot" className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Copilot Assist</span>
          </button>
          <button onClick={copyOutput} disabled={!output} aria-label="Copy output" className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Output'}</span>
          </button>
          <button onClick={downloadOutput} disabled={!output} aria-label="Download output" className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 text-xs text-slate-400">
            <label htmlFor="generic-tool-input">Input Data</label>
            <span>{input.length.toLocaleString()} characters</span>
          </div>
          <textarea
            id="generic-tool-input"
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') handleExecute(); }}
            rows={10}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 shadow-inner focus:border-indigo-500 focus:outline-none"
            placeholder={tool.placeholder ?? 'Type or paste input here...'}
            aria-label={tool.inputLabel ?? 'Tool input'}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 text-xs text-slate-400">
            <label htmlFor="generic-tool-output">Processed Output</label>
            <span className={error ? 'text-amber-400' : 'text-emerald-400'}>{error ? 'Not executed' : 'Verified engine'}</span>
          </div>
          <textarea
            id="generic-tool-output"
            readOnly
            value={output}
            rows={10}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-4 font-mono text-xs leading-relaxed text-emerald-300 shadow-inner focus:outline-none"
            placeholder="Output appears here..."
            aria-label={tool.outputLabel ?? 'Tool output'}
          />
        </div>
      </div>
    </div>
  );
};
