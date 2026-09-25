import React, { useState, useEffect, useRef } from 'react';
import { Download, Copy, Check, QrCode, Sparkles } from 'lucide-react';

export const QrCodeGeneratorTool: React.FC = () => {
  const [text, setText] = useState<string>('https://github.com/smurari229-ai/coding-super-hub');
  const [size, setSize] = useState<number>(240);
  const [fgColor, setFgColor] = useState<string>('#ffffff');
  const [bgColor, setBgColor] = useState<string>('#0f172a');
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render QR code using a clean embedded matrix generator or dynamic URL
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${fgColor.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}&margin=1`;

  const handleDownload = async () => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qrcode.png';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.open(qrUrl, '_blank');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Controls */}
        <div className="space-y-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
          <span className="font-semibold text-white block">QR Code Configuration</span>

          <div className="space-y-1">
            <label className="text-slate-400">Content (URL, Text, or Wi-Fi string)</label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-mono resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-slate-400">Foreground Color</label>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-slate-700 bg-transparent"
                />
                <span className="font-mono uppercase text-slate-300">{fgColor}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Background Color</label>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-slate-700 bg-transparent"
                />
                <span className="font-mono uppercase text-slate-300">{bgColor}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-slate-400">
              <span>Resolution Size</span>
              <span className="font-mono text-white">{size} x {size} px</span>
            </div>
            <input
              type="range"
              min={120}
              max={600}
              step={20}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        {/* Live QR Preview & Actions */}
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="p-4 rounded-2xl border border-slate-800 shadow-xl overflow-hidden" style={{ backgroundColor: bgColor }}>
            <img
              src={qrUrl}
              alt="Generated QR Code"
              width={200}
              height={200}
              className="rounded-lg shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download High-Res PNG</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Copy Image URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
