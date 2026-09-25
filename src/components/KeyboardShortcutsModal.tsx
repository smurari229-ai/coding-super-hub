import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ K / Ctrl K', desc: 'Open global search across all 500+ tools' },
    { key: '/', desc: 'Quick jump to search' },
    { key: '?', desc: 'Show this keyboard shortcuts guide' },
    { key: 'Esc', desc: 'Close any open modal or drawer' },
    { key: 'P', desc: 'Open live HTML/CSS/JS Sandbox' },
    { key: 'C', desc: 'Open AI Copilot assistant' },
    { key: 'D', desc: 'Open developer deals & partner offers' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2.5">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-300">{s.desc}</span>
              <kbd className="px-2 py-1 rounded bg-slate-950 text-indigo-300 font-mono text-[11px] border border-slate-800 shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-right">
          <button onClick={onClose} className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
