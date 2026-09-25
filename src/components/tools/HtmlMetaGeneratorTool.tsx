import React, { useState } from 'react';
import { Copy, Check, Share2, Globe, Sparkles } from 'lucide-react';

export const HtmlMetaGeneratorTool: React.FC = () => {
  const [title, setTitle] = useState<string>('Coding Super Hub — 500+ High-Performance Developer Tools');
  const [description, setDescription] = useState<string>('Free, fast, and privacy-first all-in-one developer toolbox. Formatters, crypto hashing, CSS generators, regex, and AI assistance in your browser.');
  const [url, setUrl] = useState<string>('https://codingsuperhub.dev');
  const [image, setImage] = useState<string>('https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80');
  const [author, setAuthor] = useState<string>('smurari229');
  const [twitter, setTwitter] = useState<string>('@smurari_dev');
  const [copied, setCopied] = useState<boolean>(false);

  const generatedHtml = `<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title" content="${title}" />
<meta name="description" content="${description}" />
<meta name="author" content="${author}" />
<link rel="canonical" href="${url}" />

<!-- Open Graph / Facebook / LinkedIn -->
<meta property="og:type" content="website" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="${twitter}" />
<meta name="twitter:creator" content="${twitter}" />
<meta name="twitter:url" content="${url}" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
          <span className="font-semibold text-white block">Metadata Configuration</span>

          <div className="space-y-1">
            <label className="text-slate-400">Page Title ({title.length}/60 chars)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Page Description ({description.length}/160 chars)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Canonical Website URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">OpenGraph Social Share Image URL</label>
            <input
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Live Social Share Card Preview */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-slate-400 block px-1">Live Social Card Preview (Twitter / X)</span>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
            <div className="h-44 w-full bg-slate-900 overflow-hidden relative">
              <img
                src={image}
                alt="Social Card Banner"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as any).src = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200';
                }}
              />
            </div>
            <div className="p-4 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                {url ? new URL(url).hostname : 'website.com'}
              </span>
              <h3 className="font-bold text-sm text-white line-clamp-1">{title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Meta Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Generated HTML Header Tags</span>
          <button
            onClick={handleCopy}
            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Tags' : 'Copy All Meta Tags'}</span>
          </button>
        </div>
        <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed selection:bg-indigo-500">
          {generatedHtml}
        </pre>
      </div>
    </div>
  );
};
