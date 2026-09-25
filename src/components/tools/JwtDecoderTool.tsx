import React, { useMemo, useState } from 'react';
import { Copy, Check, AlertCircle, Clock } from 'lucide-react';
type JwtObject = Record<string, unknown>;
function decodeSegment(segment: string): JwtObject {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) throw new Error('Invalid base64url characters in JWT segment.');
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (segment.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JWT header and payload must be JSON objects.');
  return value as JwtObject;
}
export const JwtDecoderTool: React.FC = () => {
  const [token, setToken] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMzQ1NiIsIm5hbWUiOiJEZXZlbG9wZXIiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3OTAzNTAwMDB9.signature_placeholder');
  const [copied, setCopied] = useState<string | null>(null);
  const decoded = useMemo(() => { try { const parts = token.trim().replace(/^Bearer\s+/i, '').split('.'); if (parts.length !== 3) throw new Error('JWT must contain exactly 3 segments.'); return { header: decodeSegment(parts[0]), payload: decodeSegment(parts[1]), signature: parts[2], error: null as string | null }; } catch (e) { return { header: null, payload: null, signature: '', error: e instanceof Error ? e.message : 'Unable to decode JWT.' }; } }, [token]);
  const expiry = useMemo(() => { const exp = decoded.payload?.exp; if (typeof exp !== 'number') return null; const date = new Date(exp * 1000); return { date, expired: date.getTime() <= Date.now() }; }, [decoded.payload]);
  const copy = async (key: string, value: unknown) => { await navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value, null, 2)); setCopied(key); window.setTimeout(() => setCopied(null), 1800); };
  return <div className="space-y-4">
    <textarea value={token} onChange={(e) => setToken(e.target.value)} rows={3} spellCheck={false} aria-label="JWT token" className="w-full p-3 font-mono text-xs text-indigo-300 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 resize-y" />
    {decoded.error ? <div role="alert" className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{decoded.error}</div> : <div className="space-y-4">
      {expiry && <div className={'p-3 rounded-xl border flex items-center justify-between text-xs ' + (expiry.expired ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300')}><span className="flex items-center gap-2"><Clock className="w-4 h-4" />{expiry.expired ? 'Expired' : 'Not expired'}</span><span className="font-mono">{expiry.date.toLocaleString()}</span></div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[['header', 'Header', decoded.header], ['payload', 'Payload', decoded.payload]].map(([key, label, value]) => <div key={String(key)}><div className="flex items-center justify-between text-xs px-1 mb-1.5"><span className="font-semibold text-indigo-400">{String(label)}</span><button onClick={() => copy(String(key), value)} className="text-slate-400 hover:text-white flex items-center gap-1">{copied === key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy</button></div><pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-auto max-h-80">{JSON.stringify(value, null, 2)}</pre></div>)}</div>
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"><div className="text-slate-500 mb-1">Signature segment</div><code className="text-slate-300 break-all select-all">{decoded.signature}</code></div>
      <p className="text-[11px] text-slate-500">Decode/inspection only. This tool never verifies the signature and never sends the token to a server.</p>
    </div>}
  </div>;
};