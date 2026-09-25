import React, { useEffect, useState } from 'react';
import { Copy, Check, Download, RefreshCw } from 'lucide-react';

interface UuidGeneratorToolProps {
  toolId?: string;
}

const NANOID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-';

function randomBytes(length: number) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function uuidV4() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function uuidV7() {
  const bytes = randomBytes(16);
  const timestamp = BigInt(Date.now());
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = Number((timestamp >> BigInt((5 - i) * 8)) & 0xffn);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function nanoid(length: number) {
  const result: string[] = [];
  // Rejection sampling avoids modulo bias while keeping the generator dependency-free.
  const mask = 63;
  const step = Math.max(16, Math.ceil(1.6 * length));
  while (result.length < length) {
    for (const byte of randomBytes(step)) {
      const index = byte & mask;
      if (index < NANOID_ALPHABET.length) result.push(NANOID_ALPHABET[index]);
      if (result.length === length) break;
    }
  }
  return result.join('');
}

export const UuidGeneratorTool: React.FC<UuidGeneratorToolProps> = ({ toolId }) => {
  const [version, setVersion] = useState<'v4' | 'v7' | 'nanoid'>(toolId === 'nanoid-generator' ? 'nanoid' : 'v4');
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [nanoidLength, setNanoidLength] = useState(21);
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const safeCount = Math.min(100, Math.max(1, count));
    const safeLength = Math.min(64, Math.max(1, nanoidLength));
    const results = Array.from({ length: safeCount }, () => {
      let id = version === 'v7' ? uuidV7() : version === 'nanoid' ? nanoid(safeLength) : uuidV4();
      if (!hyphens && version !== 'nanoid') id = id.replace(/-/g, '');
      return uppercase ? id.toUpperCase() : id;
    });
    setGeneratedIds(results);
  };

  useEffect(() => {
    generate();
  }, [version, count, uppercase, hyphens, nanoidLength]);

  const copyAll = async () => {
    await navigator.clipboard.writeText(generatedIds.join('\n'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const blob = new Blob([generatedIds.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${version}-ids.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'v4', label: 'UUID v4' },
              { id: 'v7', label: 'UUID v7' },
              { id: 'nanoid', label: 'NanoID' },
            ].map((item) => (
              <button key={item.id} onClick={() => setVersion(item.id as typeof version)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${version === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
                {item.label}
              </button>
            ))}
          </div>
          <button onClick={generate} className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
          <label className="flex items-center gap-2">Count
            <select aria-label="Number of identifiers" value={count} onChange={(e) => setCount(Number(e.target.value))} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white">
              {[1, 5, 10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>

          {version !== 'nanoid' && (
            <>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} />
                Include Hyphens
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
                UPPERCASE
              </label>
            </>
          )}

          {version === 'nanoid' && (
            <label className="flex items-center gap-2">
              Length
              <input aria-label="NanoID length" type="number" min={1} max={64} value={nanoidLength} onChange={(e) => setNanoidLength(Number(e.target.value))} className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white" />
            </label>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>{generatedIds.length} identifiers · browser cryptography only</span>
        <div className="flex items-center gap-3">
          <button onClick={copyAll} disabled={!generatedIds.length} className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 flex items-center gap-1">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy All'}
          </button>
          <button onClick={download} disabled={!generatedIds.length} className="text-slate-400 hover:text-slate-200 disabled:opacity-40 flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1.5 max-h-80 overflow-y-auto">
        {generatedIds.map((id, index) => (
          <div key={`${id}-${index}`} className="flex items-center justify-between gap-3 py-1 px-2 rounded hover:bg-slate-900">
            <span className="text-slate-200 break-all select-all">{id}</span>
            <button onClick={() => navigator.clipboard.writeText(id)} className="text-slate-500 hover:text-white shrink-0" aria-label={`Copy identifier ${index + 1}`}>
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 px-1">All identifiers are generated locally. Do not treat generated IDs as authentication credentials or secrets.</p>
    </div>
  );
};
