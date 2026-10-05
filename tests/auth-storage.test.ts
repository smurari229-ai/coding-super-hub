import { describe, expect, it, beforeEach } from 'vitest';
import { getAuthSession, signOut } from '../src/lib/auth';

describe('auth session storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('reads auth sessions from sessionStorage only', () => {
    const session = {
      access_token: 'access',
      refresh_token: 'refresh',
      expires_at: Date.now() + 60_000,
      user: { id: 'user-1', email: 'user@example.com' },
    };

    sessionStorage.setItem('csh_auth_session', JSON.stringify(session));
    expect(getAuthSession()).toEqual(session);

    localStorage.setItem('csh_auth_session', JSON.stringify({
      ...session,
      user: { id: 'wrong-source' },
    }));
    expect(getAuthSession()?.user.id).toBe('user-1');
  });

  it('clears the session on sign out', () => {
    sessionStorage.setItem('csh_auth_session', '{}');
    signOut();
    expect(sessionStorage.getItem('csh_auth_session')).toBeNull();
  });
});
