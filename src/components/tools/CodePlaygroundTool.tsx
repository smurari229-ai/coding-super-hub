import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Monitor, Smartphone, Terminal, Code2, Sparkles } from 'lucide-react';

export const CodePlaygroundTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [logs, setLogs] = useState<string[]>([]);

  const defaultHtml = `<div class="card">
  <div class="badge">Live Sandbox</div>
  <h2>Coding Super Hub</h2>
  <p>Edit HTML, CSS, or JS tabs to see changes instantly!</p>
  <button id="clickBtn">Click Me: <span id="count">0</span></button>
</div>`;

  const defaultCss = `body {
  margin: 0;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #090d16;
  color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  box-sizing: border-box;
}

.card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 20px;
  padding: 28px;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 12px;
}

h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
}

p {
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 20px;
}

button {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #4338ca;
}`;

  const defaultJs = `let count = 0;
const btn = document.getElementById('clickBtn');
const countSpan = document.getElementById('count');

btn.addEventListener('click', () => {
  count++;
  countSpan.textContent = count;
  console.log('Button clicked! Current count:', count);
});

console.log('Sandbox loaded successfully!');`;

  const [html, setHtml] = useState<string>(defaultHtml);
  const [css, setCss] = useState<string>(defaultCss);
  const [js, setJs] = useState<string>(defaultJs);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const runCode = () => {
    if (!iframeRef.current) return;
    const documentContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css}</style>
          <script>
            // Capture console.log
            const origLog = console.log;
            console.log = function(...args) {
              window.parent.postMessage({ type: 'CONSOLE_LOG', message: args.join(' ') }, '*');
              origLog.apply(console, args);
            };
          </script>
        </head>
        <body>
          ${html}
          <script>${js}<\/script>
        </body>
      </html>
    `;
    iframeRef.current.srcdoc = documentContent;
  };

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CONSOLE_LOG') {
        setLogs(prev => [...prev.slice(-30), e.data.message]);
      }
    };
    window.addEventListener('message', handleMsg);
    runCode();
    return () => window.removeEventListener('message', handleMsg);
  }, [html, css, js]);

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1">
          {(['html', 'css', 'js'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase font-mono transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-400">
            <button
              onClick={() => setDeviceView('desktop')}
              className={`p-1.5 rounded ${deviceView === 'desktop' ? 'bg-slate-800 text-white' : 'hover:text-slate-200'}`}
              title="Desktop viewport"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-1.5 rounded ${deviceView === 'mobile' ? 'bg-slate-800 text-white' : 'hover:text-slate-200'}`}
              title="Mobile viewport"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={runCode}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Editor & IFrame Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-mono uppercase font-bold text-indigo-400">{activeTab} Source</span>
            <span>Real-time execution</span>
          </div>

          {activeTab === 'html' && (
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={16}
              className="w-full p-4 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
              spellCheck={false}
            />
          )}

          {activeTab === 'css' && (
            <textarea
              value={css}
              onChange={(e) => setCss(e.target.value)}
              rows={16}
              className="w-full p-4 font-mono text-xs text-indigo-300 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
              spellCheck={false}
            />
          )}

          {activeTab === 'js' && (
            <textarea
              value={js}
              onChange={(e) => setJs(e.target.value)}
              rows={16}
              className="w-full p-4 font-mono text-xs text-amber-300 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
              spellCheck={false}
            />
          )}
        </div>

        {/* Live Preview & Sandbox Frame */}
        <div className="space-y-2 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Sandboxed IFrame Preview</span>
            <span className="text-[11px] text-emerald-400">● Live</span>
          </div>

          <div className={`rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden flex-1 flex items-center justify-center p-2 min-h-[300px]`}>
            <iframe
              ref={iframeRef}
              title="Code Preview Sandbox"
              sandbox="allow-scripts allow-modals"
              className={`border-0 rounded-xl transition-all ${
                deviceView === 'mobile' ? 'w-[320px] h-[360px] shadow-2xl border border-slate-800' : 'w-full h-full min-h-[340px]'
              }`}
            />
          </div>

          {/* Console Output Drawer */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                Console Output
              </span>
              <button
                onClick={() => setLogs([])}
                className="hover:text-slate-300"
              >
                Clear
              </button>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-0.5 pt-1 text-[11px]">
              {logs.length === 0 ? (
                <span className="text-slate-600">No console logs yet.</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-emerald-400">
                    &gt; {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
