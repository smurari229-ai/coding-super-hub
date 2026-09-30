import React, { useState } from 'react';
import { Loader2, LogIn, UserPlus, X } from 'lucide-react';
import { signIn, signOut, signUp, type AuthUser } from '../lib/supabase-auth';

interface AuthModalProps {
  isOpen: boolean;
  user: AuthUser | null;
  onClose: () => void;
  onAuthChanged: (user: AuthUser | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, user, onClose, onAuthChanged }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const submit = async () => {
    setStatus(null);
    if (!email.trim() || password.length < 8) {
      setStatus('Enter a valid email and a password of at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const session = await signIn(email, password);
        onAuthChanged(session.user);
        setStatus('Signed in successfully.');
      } else {
        const result = await signUp(email, password);
        if (result.session) {
          onAuthChanged(result.session.user);
          setStatus('Account created and signed in.');
        } else {
          setStatus('Account created. Check your email to confirm the account, then sign in.');
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut();
      onAuthChanged(null);
      setStatus('Signed out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">Account</p>
            <h2 className="text-xl font-bold text-white">{user ? 'Your Coding Super Hub account' : mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" aria-label="Close account dialog">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {user ? (
            <>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200">
                Signed in as <span className="font-semibold text-white">{user.email || user.id}</span>
              </div>
              <p className="text-xs text-slate-400">Your account identity is used to bind verified Pro purchases to the correct user. Free tools remain available without an account.</p>
              <button
                onClick={logout}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button onClick={() => setMode('signin')} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${mode === 'signin' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Sign in</button>
                <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${mode === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Create account</button>
              </div>
              <label className="block text-xs text-slate-400">
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-indigo-500" />
              </label>
              <label className="block text-xs text-slate-400">
                Password
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-indigo-500" />
              </label>
              {status && <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200">{status}</div>}
              <button
                onClick={() => void submit()}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
              <p className="text-[11px] text-slate-500">Authentication is handled by Supabase Auth. Payment credentials never enter the browser.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
