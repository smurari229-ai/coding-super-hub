import React, { useEffect, useState } from 'react';
import { getAccessToken, getAuthSession, sendEmailOtp, signOut, verifyEmailOtp } from '../../lib/auth';
import { Sparkles, Bot, Copy, Check, AlertCircle } from 'lucide-react';

type Task = 'fix' | 'explain' | 'optimize' | 'tests' | 'convert';

const TASK_PROMPTS: Record<Task, string> = {
  fix: 'Identify bugs, performance bottlenecks, and edge-case errors. Provide a corrected production-ready implementation with concise explanations.',
  explain: 'Explain how this code works step-by-step, including time and space complexity where applicable.',
  optimize: 'Refactor and optimize this code for speed, readability, maintainability, and idiomatic modern TypeScript where applicable.',
  tests: 'Write a comprehensive unit-test suite with important edge cases, using Vitest or Jest syntax.',
  convert: 'Convert or modernize this code into clean, type-safe idiomatic TypeScript.'
};

export const AiCopilotTool: React.FC = () => {
  const [task, setTask] = useState<Task>('fix');
  const [code, setCode] = useState<string>(`function findDuplicates(arr) {
  let duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      if (i !== j && arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}`);
  const [customPrompt, setCustomPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(getAuthSession()?.user.email ?? '');
  const [otp, setOtp] = useState('');
  const [authReady, setAuthReady] = useState(Boolean(getAuthSession()));
  const [otpSent, setOtpSent] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);

  useEffect(() => {
    setAuthReady(Boolean(getAuthSession()));
  }, []);

  const handleSendOtp = async () => {
    try {
      setError(null);
      await sendEmailOtp(email);
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the sign-in code.');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setError(null);
      await verifyEmailOtp(email, otp);
      setAuthReady(true);
      setOtp('');
      setOtpSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the sign-in code.');
    }
  };

  const handleGenerate = async () => {
    const token = await getAccessToken();
    if (!token) {
      setAuthReady(false);
      setError('Sign in is required before using AI Copilot.');
      return;
    }
    if (!aiConsent) {
      setError('Please confirm that your code and instructions will be sent to Google Gemini for AI processing.');
      return;
    }
    setLoading(true);
    setError(null);
    setResponse('');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          task,
          instruction: TASK_PROMPTS[task],
          customPrompt,
          code
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'AI request failed');
      }

      setResponse(typeof data?.text === 'string' ? data.text : 'No response returned from the AI provider.');
      setAuthReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the response. Please copy it manually.');
    }
  };

  return (
    <div className="space-y-4">
      {!authReady ? (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div>
            <div className="text-sm font-semibold text-white">Sign in for secure AI access</div>
            <p className="text-[11px] text-slate-500 mt-1">AI requests require a verified Supabase Auth identity. The server, not localStorage, enforces Pro status and the 10 successful calls/day Free quota.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" aria-label="Email for AI sign in" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            {!otpSent ? (
              <button onClick={handleSendOtp} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">Send code</button>
            ) : (
              <>
                <input value={otp} onChange={e => setOtp(e.target.value)} inputMode="numeric" maxLength={8} placeholder="Email code" aria-label="Email verification code" className="w-full sm:w-36 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                <button onClick={handleVerifyOtp} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">Verify</button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[11px] text-slate-400">Signed in securely{email ? ' as ' + email : ''}. AI quota is enforced on the server.</span>
          <button onClick={() => { signOut(); setAuthReady(false); setOtpSent(false); }} className="text-[11px] text-slate-400 hover:text-white">Sign out</button>
        </div>
      )}
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {([
              ['fix', '🐛 Fix Bugs & Issues'],
              ['explain', '📖 Explain Code'],
              ['optimize', '⚡ Optimize & Refactor'],
              ['tests', '🧪 Generate Unit Tests'],
              ['convert', '✨ Convert to TypeScript']
            ] as Array<[Task, string]>).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTask(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  task === id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-500 border border-slate-800 rounded-lg px-2 py-1">
            Gemini • server-protected
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Your API key is never entered into or exposed by the browser. Requests are sent to the protected server API, which applies input and rate limits before calling Gemini.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ai-code-input" className="text-xs font-semibold text-slate-400 block px-1">Source Code to Inspect</label>
        <textarea
          id="ai-code-input"
          value={code}
          onChange={e => setCode(e.target.value)}
          rows={10}
          maxLength={20000}
          className="w-full p-4 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
          spellCheck={false}
        />
        <div className="text-right text-[10px] text-slate-600">{code.length}/20000</div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <input
          type="text"
          aria-label="Additional AI instruction"
          maxLength={4000}
          placeholder="Optional instruction (for example: use ES6 syntax and avoid mutations)"
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !code.trim() || !aiConsent}
          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 shrink-0"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run AI Copilot</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {response && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-indigo-400" />
              AI Copilot Response
            </span>
            <button
              onClick={handleCopy}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Response'}</span>
            </button>
          </div>
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap selection:bg-indigo-500 break-words">
            {response}
          </div>
        </div>
      )}
    </div>
  );
};
