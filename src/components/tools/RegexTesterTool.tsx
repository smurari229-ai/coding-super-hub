import React, { useState } from 'react';
import { Copy, Check, AlertCircle, CheckCircle2, Bookmark } from 'lucide-react';

export const RegexTesterTool: React.FC = () => {
  const [pattern, setPattern] = useState<string>('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})');
  const [flags, setFlags] = useState<{ g: boolean; i: boolean; m: boolean; s: boolean }>({
    g: true,
    i: true,
    m: false,
    s: false
  });
  const [testString, setTestString] = useState<string>(
    `Welcome to Coding Super Hub!
Contact support at help@codingsuperhub.dev or admin@smurari.ai.
Invalid email: test@domain without extension.
Feedback: contact-team+beta@company.co.uk!`
  );

  const presets = [
    { name: 'Email Address', pattern: '([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})', flags: 'gi' },
    { name: 'URL (HTTP/HTTPS)', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)', flags: 'gi' },
    { name: 'IPv4 Address', pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b', flags: 'g' },
    { name: 'Hex Color Code', pattern: '#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\\b', flags: 'gi' },
    { name: 'Date (YYYY-MM-DD)', pattern: '\\b(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b', flags: 'g' },
    { name: 'UUID v4', pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}', flags: 'gi' },
  ];

  const flagStr = `${flags.g ? 'g' : ''}${flags.i ? 'i' : ''}${flags.m ? 'm' : ''}${flags.s ? 's' : ''}`;

  let matches: { match: string; index: number; groups: string[] }[] = [];
  let error: string | null = null;

  try {
    const regex = new RegExp(pattern, flagStr);
    if (flags.g) {
      let m;
      let count = 0;
      while ((m = regex.exec(testString)) !== null && count < 200) {
        matches.push({
          match: m[0],
          index: m.index,
          groups: m.slice(1)
        });
        count++;
        if (m.index === regex.lastIndex) regex.lastIndex++;
      }
    } else {
      const m = regex.exec(testString);
      if (m) {
        matches.push({
          match: m[0],
          index: m.index,
          groups: m.slice(1)
        });
      }
    }
  } catch (err: any) {
    error = err.message || 'Invalid regular expression';
  }

  const applyPreset = (p: typeof presets[0]) => {
    setPattern(p.pattern);
    setFlags({
      g: p.flags.includes('g'),
      i: p.flags.includes('i'),
      m: p.flags.includes('m'),
      s: p.flags.includes('s'),
    });
  };

  return (
    <div className="space-y-4">
      {/* Pattern Bar */}
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-500">
            <span className="text-slate-500 font-mono text-sm mr-1">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Enter regular expression pattern..."
              className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none"
              spellCheck={false}
            />
            <span className="text-slate-500 font-mono text-sm ml-1">/</span>
            <span className="text-indigo-400 font-mono text-xs ml-1 font-semibold">{flagStr || 'none'}</span>
          </div>

          {/* Flags */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            {(['g', 'i', 'm', 's'] as const).map((flag) => (
              <label key={flag} className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={flags[flag]}
                  onChange={(e) => setFlags({ ...flags, [flag]: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 w-3 h-3"
                />
                <span className="font-mono text-slate-300 font-medium">{flag}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-none text-xs">
          <span className="text-slate-500 flex items-center gap-1 shrink-0">
            <Bookmark className="w-3.5 h-3.5" /> Presets:
          </span>
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors whitespace-nowrap text-[11px]"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Test String */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Test String</span>
          <span>{matches.length} matches found</span>
        </div>
        <textarea
          value={testString}
          onChange={(e) => setTestString(e.target.value)}
          placeholder="Paste or write text to test matches against..."
          rows={5}
          className="w-full p-3 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
          spellCheck={false}
        />
      </div>

      {/* Match Results */}
      {error ? (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-mono">{error}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-white px-1">Captured Matches ({matches.length})</span>
          {matches.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
              No matches found with current pattern and test string.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {matches.map((m, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-indigo-400 font-semibold">Match #{idx + 1}</span>
                    <span>Index: {m.index}</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 text-emerald-300 break-all select-all font-semibold">
                    {m.match}
                  </div>
                  {m.groups.length > 0 && (
                    <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                      {m.groups.map((grp, gIdx) => (
                        <div key={gIdx} className="flex gap-1.5">
                          <span className="text-slate-500">Group {gIdx + 1}:</span>
                          <span className="text-slate-200">{grp || 'null'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
