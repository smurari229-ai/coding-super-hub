import React, { useState } from 'react';
import { Copy, Check, Palette, CheckCircle2, XCircle } from 'lucide-react';

export const ColorPaletteTool: React.FC = () => {
  const [hex, setHex] = useState<string>('#6366f1'); // Indigo 500
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Convert HEX to RGB
  const hexToRgb = (h: string) => {
    let clean = h.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  };

  // Convert RGB to HSL
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  // Calculate relative luminance
  const luminance = (r: number, g: number, b: number) => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  // Contrast Ratio
  const contrastRatio = (lum1: number, lum2: number) => {
    const brighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (brighter + 0.05) / (darker + 0.05);
  };

  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const lum = luminance(rgb.r, rgb.g, rgb.b);
  const contrastWhite = contrastRatio(lum, 1.0);
  const contrastBlack = contrastRatio(lum, 0.0);

  // Generate 50-950 Tailwind shades
  const shades = [
    { name: '50', l: 96 },
    { name: '100', l: 90 },
    { name: '200', l: 80 },
    { name: '300', l: 70 },
    { name: '400', l: 60 },
    { name: '500', l: 50 },
    { name: '600', l: 40 },
    { name: '700', l: 30 },
    { name: '800', l: 20 },
    { name: '900', l: 12 },
    { name: '950', l: 6 },
  ].map(s => {
    // Generate hex from HSL
    const lNorm = s.l / 100;
    const sNorm = hsl.s / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs((hsl.h / 60) % 2 - 1));
    const m = lNorm - c / 2;
    let r = 0, g = 0, b = 0;
    if (hsl.h < 60) { r = c; g = x; b = 0; }
    else if (hsl.h < 120) { r = x; g = c; b = 0; }
    else if (hsl.h < 180) { r = 0; g = c; b = x; }
    else if (hsl.h < 240) { r = 0; g = x; b = c; }
    else if (hsl.h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const rInt = Math.round((r + m) * 255);
    const gInt = Math.round((g + m) * 255);
    const bInt = Math.round((b + m) * 255);
    const hexVal = '#' + [rInt, gInt, bInt].map(v => v.toString(16).padStart(2, '0')).join('');
    return { name: s.name, hex: hexVal };
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Primary Color Picker Bar */}
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="w-12 h-12 rounded-xl border-2 border-slate-700 bg-transparent cursor-pointer"
          />
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Base Color (HEX)</span>
            <input
              type="text"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="bg-transparent font-mono font-bold text-white text-base focus:outline-none uppercase"
            />
          </div>
        </div>

        {/* Color Values Table */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">RGB</span>
            <span className="text-slate-200">rgb({rgb.r}, {rgb.g}, {rgb.b})</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">HSL</span>
            <span className="text-slate-200">hsl({hsl.h}, {hsl.s}%, {hsl.l}%)</span>
          </div>
        </div>
      </div>

      {/* WCAG Contrast Ratings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* White Text Contrast */}
        <div
          className="p-4 rounded-2xl border border-slate-800 flex items-center justify-between"
          style={{ backgroundColor: hex, color: '#ffffff' }}
        >
          <div>
            <span className="text-xs font-semibold block">White Text (#FFFFFF)</span>
            <span className="text-2xl font-black">{contrastWhite.toFixed(2)} : 1</span>
          </div>
          <div className="space-y-1 text-right text-xs font-semibold">
            <div className="flex items-center gap-1 justify-end">
              {contrastWhite >= 4.5 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
              <span>WCAG AA (Normal)</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              {contrastWhite >= 7.0 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
              <span>WCAG AAA (Enhanced)</span>
            </div>
          </div>
        </div>

        {/* Black Text Contrast */}
        <div
          className="p-4 rounded-2xl border border-slate-800 flex items-center justify-between"
          style={{ backgroundColor: hex, color: '#000000' }}
        >
          <div>
            <span className="text-xs font-semibold block">Black Text (#000000)</span>
            <span className="text-2xl font-black">{contrastBlack.toFixed(2)} : 1</span>
          </div>
          <div className="space-y-1 text-right text-xs font-semibold">
            <div className="flex items-center gap-1 justify-end">
              {contrastBlack >= 4.5 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
              <span>WCAG AA (Normal)</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              {contrastBlack >= 7.0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
              <span>WCAG AAA (Enhanced)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Tailwind Shades Scale */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-white px-1">Tailwind-Style 50-950 Shade Scale</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
          {shades.map((shade) => (
            <div
              key={shade.name}
              onClick={() => handleCopy(shade.name, shade.hex)}
              className="p-3 rounded-xl border border-slate-800 hover:border-slate-600 transition-all cursor-pointer group flex flex-col justify-between h-24"
              style={{ backgroundColor: shade.hex }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-white">
                  {shade.name}
                </span>
                {copiedKey === shade.name ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Copy className="w-3 h-3 text-white/70 group-hover:text-white" />
                )}
              </div>
              <span className="font-mono text-[10px] font-semibold text-white/90 drop-shadow">
                {shade.hex}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
