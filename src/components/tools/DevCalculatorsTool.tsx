import React, { useState } from 'react';
import { Calculator, ArrowRightLeft, Sparkles, Check } from 'lucide-react';

interface DevCalculatorsToolProps {
  toolId?: string;
}

export const DevCalculatorsTool: React.FC<DevCalculatorsToolProps> = ({ toolId }) => {
  const [calcType, setCalcType] = useState<'percentage' | 'units' | 'math'>(
    toolId?.includes('unit') ? 'units' :
    toolId?.includes('prime') || toolId?.includes('factorial') || toolId?.includes('fibonacci') || toolId?.includes('gcd') ? 'math' : 'percentage'
  );

  // Percentage state
  const [pctX, setPctX] = useState<number>(20);
  const [pctY, setPctY] = useState<number>(150);

  // Units state
  const [unitCategory, setUnitCategory] = useState<'bytes' | 'length' | 'weight' | 'temp'>('bytes');
  const [unitVal, setUnitVal] = useState<number>(1024);

  // Math state
  const [mathNum1, setMathNum1] = useState<number>(48);
  const [mathNum2, setMathNum2] = useState<number>(18);

  // Math calculations
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const lcm = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b));
  const isPrime = (n: number): boolean => {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  };
  const factorial = (n: number): number => {
    if (n < 0) return 0;
    if (n > 20) return Infinity;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        {[
          { id: 'percentage', label: 'Percentage & Discounts' },
          { id: 'units', label: 'Unit & Data Size Converter' },
          { id: 'math', label: 'GCD, LCM & Primes' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setCalcType(t.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              calcType === t.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Percentage Mode */}
      {calcType === 'percentage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="font-semibold text-xs text-white block">What is X% of Y?</span>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="number"
                value={pctX}
                onChange={(e) => setPctX(Number(e.target.value))}
                className="w-20 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
              />
              <span className="text-slate-400">% of</span>
              <input
                type="number"
                value={pctY}
                onChange={(e) => setPctY(Number(e.target.value))}
                className="w-24 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
              />
              <span className="text-slate-400">=</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {((pctX / 100) * pctY).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="font-semibold text-xs text-white block">Percentage Increase / Decrease</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">From</span>
              <input
                type="number"
                value={pctX}
                onChange={(e) => setPctX(Number(e.target.value))}
                className="w-20 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
              />
              <span className="text-slate-400">to</span>
              <input
                type="number"
                value={pctY}
                onChange={(e) => setPctY(Number(e.target.value))}
                className="w-20 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
              />
              <span className="text-slate-400">=</span>
              <span className={`font-mono font-bold text-sm ${pctY >= pctX ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pctX === 0 ? '0' : (((pctY - pctX) / pctX) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Units Mode */}
      {calcType === 'units' && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Input Value:</span>
            <input
              type="number"
              value={unitVal}
              onChange={(e) => setUnitVal(Number(e.target.value))}
              className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none"
            />
            <span className="text-xs font-mono text-indigo-400 font-semibold">MB (Megabytes)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Bytes (B)</span>
              <span className="font-mono text-white">{(unitVal * 1024 * 1024).toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Kilobytes (KB)</span>
              <span className="font-mono text-white">{(unitVal * 1024).toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Gigabytes (GB)</span>
              <span className="font-mono text-emerald-400 font-semibold">{(unitVal / 1024).toFixed(3)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Terabytes (TB)</span>
              <span className="font-mono text-slate-300">{(unitVal / (1024 * 1024)).toFixed(5)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Math Mode */}
      {calcType === 'math' && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Number A:</span>
              <input
                type="number"
                value={mathNum1}
                onChange={(e) => setMathNum1(Number(e.target.value))}
                className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Number B:</span>
              <input
                type="number"
                value={mathNum2}
                onChange={(e) => setMathNum2(Number(e.target.value))}
                className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">GCD (Greatest Divisor)</span>
              <span className="font-mono font-bold text-white text-sm">{gcd(mathNum1, mathNum2)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">LCM (Least Multiple)</span>
              <span className="font-mono font-bold text-white text-sm">{lcm(mathNum1, mathNum2)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Is A Prime?</span>
              <span className={`font-mono font-bold text-sm ${isPrime(mathNum1) ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isPrime(mathNum1) ? 'Yes (Prime)' : 'No (Composite)'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Factorial (A!)</span>
              <span className="font-mono font-bold text-white text-sm">
                {mathNum1 <= 15 ? factorial(mathNum1) : 'Very Large'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
