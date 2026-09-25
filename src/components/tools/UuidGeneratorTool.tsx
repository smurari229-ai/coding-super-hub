import React, { useState } from 'react';
import { Copy, Check, Download, RefreshCw, Key } from 'lucide-react';

export const UuidGeneratorTool: React.FC = () => {
  const [version, setVersion] = useState<'v4' | 'v7' | 'nanoid'>('v4');
  const [count, setCount] = useState<number>(5);
  const [uppercase, setUppercase] = useState<boolean>(false);
  const [hyphens, setHyphens] = useState<boolean>(true);
  const [nanoidLength, setNanoidLength] = useState<number>(21);
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // UUID v4 generator
  const genV4 = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // UUID v7 generator (time-ordered)
  const genV7 = (): string => {
    const timestamp = Date.now();
    const timeHex = timestamp.toString(16).padStart(12, '0');
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(10)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Structure: 8-4-4-4-12
    const part1 = timeHex.slice(0, 8);
    const part2 = timeHex.slice(8, 12);
    const part3 = '7' + randomHex.slice(0, 3);
    const part4 = ((parseInt(randomHex.slice(3, 4), 16) & 0x3) | 0x8).toString(16) + randomHex.slice(4, 7);
    const part5 = randomHex.slice(7, 19);

    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
  };

  // NanoID generator
  const genNanoId = (len: number = 21): string => {
    const chars = 'useandom-26T1983_40STOpfontrkLzF-GHIJKLMNOVWXAbcdefghijklmnopqrstuvwxyZ';
    const randomBytes = crypto.getRandomValues(new Uint8Array(len));
    return Array.from(randomBytes).map(b => chars[b % chars.length]).join('');
  };

  const generate = () => {
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      let id = version === 'v7' ? genV7() : version === 'nanoid' ? genNanoId(nanoidLength) : genV4();
      if (!hyphens && version !== 'nanoid') {
        id = id.replace(/-/g, '');
      }
      if (uppercase) {
        id = id.toUpperCase();
      }
      results.push(id);
    }
    setGeneratedIds(results);
  };

  React.useEffect(() => {
    generate();
  }, [version, count, uppercase, hyphens, nanoidLength]);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(generatedIds.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedIds.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${version}-ids.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'v4', label: 'UUID v4 (Random)' },
              { id: 'v7', label: 'UUID v7 (Time-Sorted)' },
              { id: 'nanoid', label: 'NanoID (Compact)' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setVersion(v.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  version === v.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={generate}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate</span>
          </button>
        </div>

        {/* Options Row */}
        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Count:</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
            >
              {[1, 5, 10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {version !== 'nanoid' && (
            <>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hyphens}
                  onChange={(e) => setHyphens(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Include Hyphens</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={uppercase}
                  onChange={(e) => setUppercase(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>UPPERCASE</span>
              </label>
            </>
          )}

          {version === 'nanoid' && (
            <div className="flex items-center gap-2">
              <label className="text-slate-400">Length:</label>
              <input
                type="number"
                min={8}
                max={64}
                value={nanoidLength}
                onChange={(e) => setNanoidLength(Number(e.target.value))}
                className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Output List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Generated {generatedIds.length} identifiers</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied All' : 'Copy All'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
              title="Download as TXT"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1.5 max-h-80 overflow-y-auto selection:bg-indigo-500">
          {generatedIds.map((id, index) => (
            <div key={index} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-900 group">
              <span className="text-slate-200">{id}</span>
              <button
                onClick={() => navigator.clipboard.writeText(id)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity"
                title="Copy single ID"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
