import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Play, RefreshCw, Sparkles } from 'lucide-react';
import { ToolItem } from '../../types/tools';
import { defaultInput, executeTool } from '../../lib/tool-engine';

interface GenericToolRunnerProps {
  tool: ToolItem;
  onOpenAiCopilot: (code: string) => void;
}

const MAX_OUTPUT_LENGTH = 50_000;

export const GenericToolRunner: React.FC<GenericToolRunnerProps> = ({ tool, onOpenAiCopilot }) => {
  const initialInput = useMemo(() => defaultInput(tool), [tool]);
  const [input, setInput] = useState(initialInput);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // GenericToolRunner intentionally stays UI-focused: the shared tool engine does the
  // heavy lifting. This wrapper is ID/category aware so future fallback handlers can
  // be added here without disturbing dedicated components or the existing engine.
  const handleExecute = (value = input) => {
    const result = executeTool(tool, value);

    // Keep the component deliberately thin. All real algorithms live in
    // src/lib/tool-engine so 535 catalog entries share one tested execution path.
    // The engine is selected by tool.id/name/tags and can remain category-aware
    // without duplicating business logic in this React component.
    const boundedOutput = result.output.length > MAX_OUTPUT_LENGTH
      ? result.output.slice(0, MAX_OUTPUT_LENGTH) + '\n\n[Output truncated at the 50,000 character safety limit.]'
      : result.output;
    setOutput(boundedOutput);
    setError(result.error ?? '');
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
