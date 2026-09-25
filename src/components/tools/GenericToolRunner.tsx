import React, { useState } from 'react';
import { ToolItem } from '../../types/tools';
import { Copy, Check, Play, RefreshCw, Sparkles, Download, Layers } from 'lucide-react';

interface GenericToolRunnerProps {
  tool: ToolItem;
  onOpenAiCopilot: (code: string) => void;
}

export const GenericToolRunner: React.FC<GenericToolRunnerProps> = ({ tool, onOpenAiCopilot }) => {
  const getDefaultContent = () => {
    if (tool.id.includes('lorem')) {
      return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
    }
    if (tool.id.includes('json')) {
      return '{\n  "title": "Developer Toolbox",\n  "status": "ready",\n  "count": 500\n}';
    }
    if (tool.id.includes('css')) {
      return '.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 16px;\n}';
    }
    if (tool.id.includes('sql')) {
      return 'SELECT id, username, email FROM users WHERE active = true ORDER BY created_at DESC;';
    }
    return 'The quick brown fox jumps over the lazy dog. 1234567890!';
  };

  const [input, setInput] = useState<string>(tool.defaultInput || getDefaultContent());
  const [output, setOutput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Dynamic client-side executor for general text / data tools
  const handleExecute = () => {
    const id = tool.id;
    let res = input;

    if (id.includes('reverse')) {
      res = input.split('').reverse().join('');
    } else if (id.includes('trim')) {
      res = input.replace(/^\s+|\s+$/g, '').replace(/[ \t]+/g, ' ');
    } else if (id.includes('duplicate-line')) {
      const lines = input.split('\n');
      res = Array.from(new Set(lines)).join('\n');
    } else if (id.includes('sorter') || id.includes('sort')) {
      res = input.split('\n').sort().join('\n');
    } else if (id.includes('statistics') || id.includes('stats')) {
      const chars = input.length;
      const words = input.trim() ? input.trim().split(/\s+/).length : 0;
      const lines = input.split('\n').length;
      const readingTime = Math.ceil(words / 200);
      res = `Characters: ${chars}\nWords: ${words}\nLines: ${lines}\nEstimated Reading Time: ~${readingTime} min\nBytes: ${new Blob([input]).size} bytes`;
    } else if (id.includes('remove-empty')) {
      res = input.split('\n').filter(l => l.trim().length > 0).join('\n');
    } else if (id.includes('rot13')) {
      res = input.replace(/[a-zA-Z]/g, (c) => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
      });
    } else if (id.includes('morse')) {
      const morseMap: Record<string, string> = {
        A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
        I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
        Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
        Y: '-.--', Z: '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
        '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
        ' ': '/'
      };
      res = input.toUpperCase().split('').map(c => morseMap[c] || c).join(' ');
    } else if (id.includes('word-frequency')) {
      const words = input.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      const counts: Record<string, number> = {};
      words.forEach(w => counts[w] = (counts[w] || 0) + 1);
      res = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([w, c]) => `${w.padEnd(20)} : ${c} times`)
        .join('\n');
    } else if (id.includes('lorem')) {
      res = Array(3).fill(input).join('\n\n');
    } else {
      res = `[${tool.name} Engine Ready]\nInput Length: ${input.length} characters\nProcessed Output:\n${input}`;
    }

    setOutput(res);
  };

  React.useEffect(() => {
    handleExecute();
  }, [input, tool.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output || input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExecute}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Process</span>
          </button>
          <button
            onClick={() => setInput('')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAiCopilot(input)}
            className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Copilot Assist</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Output'}</span>
          </button>
        </div>
      </div>

      {/* Inputs / Outputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Input Data</span>
            <span>{input.length} characters</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            className="w-full p-4 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
            placeholder="Type or paste input here..."
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Processed Output</span>
            <span className="text-emerald-400">● Real-time</span>
          </div>
          <textarea
            readOnly
            value={output}
            rows={10}
            className="w-full p-4 font-mono text-xs text-emerald-300 bg-slate-950/90 rounded-2xl border border-slate-800 focus:outline-none leading-relaxed shadow-inner"
            placeholder="Output appears here..."
          />
        </div>
      </div>
    </div>
  );
};
