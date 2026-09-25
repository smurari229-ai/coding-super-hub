import React, { useState } from 'react';
import { Copy, Check, ShieldCheck, AlertCircle, Clock, Key } from 'lucide-react';

export const JwtDecoderTool: React.FC = () => {
  // Sample JWT token with standard payload
  const defaultToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMzQ1NiIsIm5hbWUiOiJTdXBlciBEZXZlbG9wZXIiLCJlbWFpbCI6ImRldkBjb2RpbmdzdXBlcmh1Yi5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTg4MDAwMDAsImV4cCI6MTc5MDM1MDAwMH0.signature_placeholder_abc123';
  const [token, setToken] = useState<string>(defaultToken);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const decodeJwt = () => {
    try {
      const parts = token.trim().split('.');
      if (parts.length !== 3) {
        return { error: 'Invalid JWT format. A valid token consists of 3 dot-separated parts: Header.Payload.Signature' };
      }

      const decodeBase64Url = (str: string) => {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        return decodeURIComponent(escape(atob(base64)));
      };

      const header = JSON.parse(decodeBase64Url(parts[0]));
      const payload = JSON.parse(decodeBase64Url(parts[1]));
      const signature = parts[2];

      return { header, payload, signature, error: null };
    } catch (e: any) {
      return { error: e.message || 'Failed to decode token segments' };
    }
  };

  const decoded = decodeJwt();

  const handleCopy = (key: string, data: any) => {
    navigator.clipboard.writeText(typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getExpiryStatus = (payload: any) => {
    if (!payload || !payload.exp) return null;
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    const isExpired = expDate < now;

    return {
      dateString: expDate.toLocaleString(),
      isExpired,
      relative: isExpired ? `Expired on ${expDate.toLocaleDateString()}` : `Valid until ${expDate.toLocaleDateString()}`
    };
  };

  const expiry = decoded.payload ? getExpiryStatus(decoded.payload) : null;

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-400 block px-1">Encoded JWT Token</label>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste Bearer or JWT token here..."
          rows={3}
          className="w-full p-3 font-mono text-xs text-indigo-300 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner break-all"
          spellCheck={false}
        />
      </div>

      {decoded.error ? (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{decoded.error}</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Expiry Pill */}
          {expiry && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              expiry.isExpired 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-semibold">{expiry.relative}</span>
              </div>
              <span className="font-mono text-[11px] opacity-80">{expiry.dateString}</span>
            </div>
          )}

          {/* Decoded Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Header */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold text-rose-400">Header (Algorithm &amp; Type)</span>
                <button
                  onClick={() => handleCopy('header', decoded.header)}
                  className="text-slate-400 hover:text-white flex items-center gap-1 font-mono text-[11px]"
                >
                  {copiedKey === 'header' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-rose-300 overflow-x-auto">
                {JSON.stringify(decoded.header, null, 2)}
              </pre>
            </div>

            {/* Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold text-indigo-400">Payload (Data Claims)</span>
                <button
                  onClick={() => handleCopy('payload', decoded.payload)}
                  className="text-slate-400 hover:text-white flex items-center gap-1 font-mono text-[11px]"
                >
                  {copiedKey === 'payload' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
                {JSON.stringify(decoded.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
