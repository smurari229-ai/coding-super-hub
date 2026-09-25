import React, { useState } from 'react';
import { Copy, Check, Download, Eye, Edit3, Code, Bold, Italic, Link, List, Quote } from 'lucide-react';

export const MarkdownEditorTool: React.FC = () => {
  const [markdown, setMarkdown] = useState<string>(`# Welcome to Coding Super Hub 🚀

An all-in-one production toolbox for **developers**, **designers**, and **DevOps engineers**.

### Key Advantages:
- ⚡ **500+ Essential Utilities**: Fast, zero-friction developer tools.
- 🔒 **100% Client-Side Privacy**: Your code and keys never touch a server.
- 🤖 **Multi-Provider AI Copilot**: Gemini, OpenAI, and Claude integrated.

\`\`\`typescript
interface DeveloperTool {
  id: string;
  name: string;
  category: string;
  latencyMs: number;
}
\`\`\`

> *"Build faster, debug smarter, and ship with confidence."*
`);

  const [activeTab, setActiveTab] = useState<'both' | 'edit' | 'preview'>('both');
  const [copied, setCopied] = useState<boolean>(false);

  // Simple Markdown-to-HTML parser
  const renderMarkdown = (text: string): string => {
    let html = text
      // Headings
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-white mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-white mt-5 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-white mt-2 mb-3 pb-2 border-b border-slate-800">$1</h1>')
      // Blockquote
      .replace(/^\> (.*$)/gim, '<blockquote class="p-3 my-2 border-l-4 border-indigo-500 bg-slate-900/60 rounded-r-lg text-slate-300 italic">$1</blockquote>')
      // Code blocks
      .replace(/```([a-z]*)\n([\s\S]*?)```/gim, '<pre class="p-3 my-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs">$1</code>')
      // Bold & Italic
      .replace(/\*\*([^\*]+)\*\*/gim, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*([^\*]+)\*/gim, '<em class="italic text-slate-200">$1</em>')
      // Unordered lists
      .replace(/^\- (.*$)/gim, '<li class="flex items-center gap-2 text-slate-300 my-1"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span><span>$1</span></li>')
      // Paragraphs
      .replace(/\n\n/gim, '<p class="my-2 text-slate-300 leading-relaxed"></p>');

    return html;
  };

  const insertSnippet = (prefix: string, suffix: string = '') => {
    setMarkdown(prev => prev + '\n' + prefix + 'text' + suffix);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => insertSnippet('**', '**')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('*', '*')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('### ')}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            title="Heading"
          >
            H3
          </button>
          <button
            onClick={() => insertSnippet('- ')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="List Item"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('> ')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Quote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('```\n', '\n```')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Code Block"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('both')}
              className={`px-2.5 py-1 rounded text-xs ${activeTab === 'both' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'}`}
            >
              Split
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-2.5 py-1 rounded text-xs ${activeTab === 'edit' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'}`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 rounded text-xs ${activeTab === 'preview' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'}`}
            >
              Preview
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Download Markdown"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor & Preview Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(activeTab === 'both' || activeTab === 'edit') && (
          <div className="space-y-1">
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={14}
              placeholder="Write Markdown here..."
              className="w-full p-4 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
            />
          </div>
        )}

        {(activeTab === 'both' || activeTab === 'preview') && (
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs leading-relaxed max-h-[420px] overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />
          </div>
        )}
      </div>
    </div>
  );
};
