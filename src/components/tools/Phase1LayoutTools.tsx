import React, { useMemo, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { ToolItem } from '../../types/tools';

type Props = { tool: ToolItem };

const cx = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(' ');

export const Phase1LayoutTools: React.FC<Props> = ({ tool }) => {
  const isGrid = tool.id === 'css-grid-generator';
  const [direction, setDirection] = useState<'row' | 'row-reverse' | 'column' | 'column-reverse'>('row');
  const [justify, setJustify] = useState('center');
  const [align, setAlign] = useState('center');
  const [alignContent, setAlignContent] = useState('stretch');
  const [justifyContent, setJustifyContent] = useState('stretch');
  const [wrap, setWrap] = useState<'nowrap' | 'wrap' | 'wrap-reverse'>('wrap');
  const [gap, setGap] = useState(16);
  const [rowGap, setRowGap] = useState(16);
  const [columnGap, setColumnGap] = useState(16);
  const [grow, setGrow] = useState(0);
  const [shrink, setShrink] = useState(1);
  const [basis, setBasis] = useState('auto');
  const [columns, setColumns] = useState(3);
  const [rows, setRows] = useState(2);
  const [minmax, setMinmax] = useState(true);
  const [gridAlign, setGridAlign] = useState('stretch');
  const [copied, setCopied] = useState(false);

  const css = useMemo(() => {
    if (isGrid) {
      const col = minmax ? `repeat(${columns}, minmax(0, 1fr))` : `repeat(${columns}, 1fr)`;
      return `.grid {
  display: grid;
  grid-template-columns: ${col};
  grid-template-rows: repeat(${rows}, auto);
  align-content: ${alignContent};
  justify-content: ${justifyContent};
  gap: ${gap}px;
  row-gap: ${rowGap}px;
  column-gap: ${columnGap}px;
  align-items: ${gridAlign};
  justify-items: ${gridAlign};
}`;
    }
    return `.container {
  display: flex;
  flex-direction: ${direction};
  justify-content: ${justify};
  align-items: ${align};
  align-content: ${alignContent};
  justify-content: ${justify};
  flex-wrap: ${wrap};
  gap: ${gap}px;
  row-gap: ${rowGap}px;
  column-gap: ${columnGap}px;
}

.container > * {
  flex-grow: ${grow};
  flex-shrink: ${shrink};
  flex-basis: ${basis};
}`;
  }, [isGrid, direction, justify, align, alignContent, justifyContent, wrap, gap, rowGap, columnGap, grow, shrink, basis, columns, rows, minmax, gridAlign]);

  const copy = async () => {
    await navigator.clipboard.writeText(css);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const reset = () => {
    setDirection('row'); setJustify('center'); setAlign('center'); setAlignContent('stretch'); setJustifyContent('stretch'); setWrap('wrap');
    setGap(16); setRowGap(16); setColumnGap(16); setGrow(0); setShrink(1); setBasis('auto');
    setColumns(3); setRows(2); setMinmax(true); setGridAlign('stretch');
  };

  const select = (label: string, value: string, onChange: (v: string) => void, options: string[]) => (
    <label className="space-y-1 text-xs text-slate-400">
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200">
        {options.map(option => <option key={option}>{option}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {isGrid ? <>
              <label className="space-y-1 text-xs text-slate-400"><span>Columns: {columns}</span><input type="range" min="1" max="8" value={columns} onChange={e => setColumns(Number(e.target.value))} className="w-full" /></label>
              <label className="space-y-1 text-xs text-slate-400"><span>Rows: {rows}</span><input type="range" min="1" max="6" value={rows} onChange={e => setRows(Number(e.target.value))} className="w-full" /></label>
              <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={minmax} onChange={e => setMinmax(e.target.checked)} /> Use minmax(0, 1fr)</label>
              {select('Item alignment', gridAlign, setGridAlign, ['stretch', 'start', 'center', 'end'])}
              {select('align-content', alignContent, setAlignContent, ['stretch','start','center','end','space-between','space-around'])}
              {select('justify-content', justifyContent, setJustifyContent, ['start','center','end','space-between','space-around','space-evenly'])}
            </> : <>
              {select('flex-direction', direction, setDirection, ['row','row-reverse','column','column-reverse'])}
              {select('justify-content', justify, setJustify, ['flex-start','center','flex-end','space-between','space-around','space-evenly'])}
              {select('align-items', align, setAlign, ['stretch','flex-start','center','flex-end','baseline'])}
              {select('align-content', alignContent, setAlignContent, ['stretch','flex-start','center','flex-end','space-between','space-around'])}
              {select('justify-content', justify, setJustify, ['flex-start','center','flex-end','space-between','space-around','space-evenly'])}
              {select('flex-wrap', wrap, setWrap, ['nowrap','wrap','wrap-reverse'])}
              {select('flex-basis', basis, setBasis, ['auto','0','25%','50%','100px'])}
              <label className="space-y-1 text-xs text-slate-400"><span>flex-grow: {grow}</span><input type="range" min="0" max="4" value={grow} onChange={e => setGrow(Number(e.target.value))} className="w-full" /></label>
              <label className="space-y-1 text-xs text-slate-400"><span>flex-shrink: {shrink}</span><input type="range" min="0" max="4" value={shrink} onChange={e => setShrink(Number(e.target.value))} className="w-full" /></label>
            </>}
            <label className="space-y-1 text-xs text-slate-400"><span>gap: {gap}px</span><input type="range" min="0" max="48" value={gap} onChange={e => setGap(Number(e.target.value))} className="w-full" /></label>
            <label className="space-y-1 text-xs text-slate-400"><span>row-gap: {rowGap}px</span><input type="range" min="0" max="48" value={rowGap} onChange={e => setRowGap(Number(e.target.value))} className="w-full" /></label>
            <label className="space-y-1 text-xs text-slate-400"><span>column-gap: {columnGap}px</span><input type="range" min="0" max="48" value={columnGap} onChange={e => setColumnGap(Number(e.target.value))} className="w-full" /></label>
          </div>
          <div className={cx("min-w-0 overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-4", isGrid ? "grid" : "flex")}
            style={isGrid
              ? { gridTemplateColumns: minmax ? `repeat(${columns}, minmax(0,1fr))` : `repeat(${columns},1fr)`, gridTemplateRows: `repeat(${rows}, minmax(52px, auto))`, gap: `${gap}px`, rowGap: `${rowGap}px`, columnGap: `${columnGap}px`, alignItems: gridAlign, justifyItems: gridAlign, alignContent, justifyContent }
              : { flexDirection: direction, justifyContent: justify, alignItems: align, alignContent, justifyContent: justify, flexWrap: wrap, gap: `${gap}px`, rowGap: `${rowGap}px`, columnGap: `${columnGap}px` }}>
            {Array.from({ length: isGrid ? columns * rows : 6 }, (_, i) => (
              <div key={i} className="flex min-h-14 min-w-16 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 text-xs font-semibold text-indigo-200"
                style={!isGrid ? { flexGrow: grow, flexShrink: shrink, flexBasis: basis } : undefined}>Item {i + 1}</div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-white">Generated CSS</h3><div className="flex gap-2"><button onClick={reset} className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300"><RefreshCw className="h-3.5 w-3.5" />Reset</button><button onClick={copy} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy'}</button></div></div>
          <pre className="max-h-[430px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-emerald-300">{css}</pre>
          <p className="text-[11px] leading-relaxed text-slate-500">Preview is rendered from the same state used to generate the CSS; no placeholder rendering is used.</p>
        </div>
      </div>
    </div>
  );
};
