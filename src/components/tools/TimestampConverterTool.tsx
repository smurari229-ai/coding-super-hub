import React, { useState, useEffect } from 'react';
import { Copy, Check, Clock, RefreshCw, Calendar } from 'lucide-react';

export const TimestampConverterTool: React.FC = () => {
  const [currentEpoch, setCurrentEpoch] = useState<number>(Math.floor(Date.now() / 1000));
  const [epochInput, setEpochInput] = useState<string>(Math.floor(Date.now() / 1000).toString());
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().slice(0, 19));
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentEpoch(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute from epochInput
  const parsedEpoch = Number(epochInput);
  // Auto detect if input is milliseconds (> 100000000000) or seconds
  const dateObj = isNaN(parsedEpoch) 
    ? new Date() 
    : new Date(parsedEpoch > 1e11 ? parsedEpoch : parsedEpoch * 1000);

  const utcString = dateObj.toUTCString();
  const localString = dateObj.toLocaleString();
  const isoString = dateObj.toISOString();
  const relativeString = (() => {
    const diffSec = Math.floor((Date.now() - dateObj.getTime()) / 1000);
    if (Math.abs(diffSec) < 60) return `${Math.abs(diffSec)} seconds ${diffSec >= 0 ? 'ago' : 'from now'}`;
    const diffMin = Math.floor(diffSec / 60);
    if (Math.abs(diffMin) < 60) return `${Math.abs(diffMin)} minutes ${diffMin >= 0 ? 'ago' : 'from now'}`;
    const diffHrs = Math.floor(diffMin / 60);
    if (Math.abs(diffHrs) < 24) return `${Math.abs(diffHrs)} hours ${diffHrs >= 0 ? 'ago' : 'from now'}`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${Math.abs(diffDays)} days ${diffDays >= 0 ? 'ago' : 'from now'}`;
  })();

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSetNow = () => {
    const now = Math.floor(Date.now() / 1000);
    setEpochInput(now.toString());
  };

  return (
    <div className="space-y-5">
      {/* Live Epoch Clock Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wider">
              Live Current Unix Epoch (Seconds)
            </span>
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              {currentEpoch}
            </span>
          </div>
        </div>

        <button
          onClick={handleSetNow}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset to Now</span>
        </button>
      </div>

      {/* Epoch to Human Converter */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Enter Unix Epoch (Seconds or Milliseconds)</label>
          <input
            type="text"
            value={epochInput}
            onChange={(e) => setEpochInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {[
            { id: 'utc', label: 'UTC String (GMT)', value: utcString },
            { id: 'local', label: 'Local Browser Time', value: localString },
            { id: 'iso', label: 'ISO 8601 Standard', value: isoString },
            { id: 'relative', label: 'Relative Difference', value: relativeString },
          ].map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono text-slate-500 block mb-0.5">
                  {item.label}
                </span>
                <p className="font-mono text-xs text-white truncate">{item.value}</p>
              </div>
              <button
                onClick={() => handleCopy(item.id, item.value)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
              >
                {copiedKey === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Human Date to Timestamp */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <span className="text-xs font-semibold text-white block">Human Date to Timestamp</span>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="datetime-local"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full sm:w-auto flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
          />
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 flex items-center gap-2">
            <span>Epoch: {Math.floor(new Date(dateInput).getTime() / 1000)}</span>
            <button
              onClick={() => handleCopy('converted', Math.floor(new Date(dateInput).getTime() / 1000).toString())}
              className="text-slate-400 hover:text-white"
            >
              {copiedKey === 'converted' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
