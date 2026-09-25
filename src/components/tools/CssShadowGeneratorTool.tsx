import React, { useState } from 'react';
import { Copy, Check, Sliders, Layers, Sparkles } from 'lucide-react';

export const CssShadowGeneratorTool: React.FC = () => {
  const [x, setX] = useState<number>(0);
  const [y, setY] = useState<number>(10);
  const [blur, setBlur] = useState<number>(25);
  const [spread, setSpread] = useState<number>(-5);
  const [color, setColor] = useState<string>('#4f46e5');
  const [opacity, setOpacity] = useState<number>(30);
  const [inset, setInset] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Convert hex + opacity to rgba
  const hexToRgba = (hexStr: string, op: number) => {
    let clean = hexStr.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${(op / 100).toFixed(2)})`;
  };

  const shadowCss = `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${hexToRgba(color, opacity)}`;

  const presets = [
    { name: 'Subtle Card', x: 0, y: 4, blur: 6, spread: -1, op: 15, col: '#000000', inset: false },
    { name: 'Floating Element', x: 0, y: 20, blur: 25, spread: -5, op: 25, col: '#4f46e5', inset: false },
    { name: 'Neon Glow', x: 0, y: 0, blur: 30, spread: 5, op: 60, col: '#6366f1', inset: false },
    { name: 'Inset Pressed', x: 0, y: 4, blur: 8, spread: 0, op: 40, col: '#000000', inset: true },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(`box-shadow: ${shadowCss};`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Visual Live Canvas */}
      <div className="p-12 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[220px]">
        <div
          className="w-48 h-32 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-center p-4 transition-all"
          style={{ boxShadow: shadowCss }}
        >
          <span className="text-xs font-semibold text-white">Live Box Shadow Preview</span>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-500 font-medium shrink-0">Presets:</span>
        {presets.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              setX(p.x);
              setY(p.y);
              setBlur(p.blur);
              setSpread(p.spread);
              setOpacity(p.op);
              setColor(p.col);
              setInset(p.inset);
            }}
            className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium whitespace-nowrap transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>X Offset</span>
            <span className="font-mono text-white">{x}px</span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Y Offset</span>
            <span className="font-mono text-white">{y}px</span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Blur Radius</span>
            <span className="font-mono text-white">{blur}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={blur}
            onChange={(e) => setBlur(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Spread Radius</span>
            <span className="font-mono text-white">{spread}px</span>
          </div>
          <input
            type="range"
            min={-30}
            max={50}
            value={spread}
            onChange={(e) => setSpread(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Opacity</span>
            <span className="font-mono text-white">{opacity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-slate-700 bg-transparent"
            />
            <span className="font-mono uppercase text-slate-300">{color}</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-medium">
            <input
              type="checkbox"
              checked={inset}
              onChange={(e) => setInset(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
            />
            <span>Inset</span>
          </label>
        </div>
      </div>

      {/* CSS Output */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
        <code className="text-xs font-mono text-indigo-300">
          box-shadow: {shadowCss};
        </code>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy CSS'}</span>
        </button>
      </div>
    </div>
  );
};
