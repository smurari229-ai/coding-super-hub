import { describe, expect, it, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getEntitlement: vi.fn(),
  supabaseRpc: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: mocks.generateContent };
  },
}));

vi.mock('../api/_supabase', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
  getEntitlement: mocks.getEntitlement,
  supabaseRpc: mocks.supabaseRpc,
  getRequestHeader: vi.fn((request: Request, name: string) => request.headers.get(name)),
}));

import { POST as aiHandler } from '../api/ai';

function request(ip: string, body = JSON.stringify({ code: 'const x = 1;', instruction: 'Explain it.' }), contentLength?: string) {
  const headers: Record<string, string> = {
    'x-forwarded-for': ip,
    'content-type': 'application/json',
  };
  if (contentLength !== undefined) headers['content-length'] = contentLength;
  return new Request('https://example.com/api/ai', {
    method: 'POST',
    headers,
    body,
  });
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'server-only-test-key';
  mocks.getAuthenticatedUser.mockReset();
  mocks.getEntitlement.mockReset();
  mocks.supabaseRpc.mockReset();
  mocks.generateContent.mockReset();
});

describe('/api/ai server authorization and quota', () => {
  it('rejects direct unauthenticated API access', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);
    const res = await aiHandler(request('198.51.100.10'));

    expect(res.status).toBe(401);
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it('returns a controlled service error when Supabase Auth is unavailable', async () => {
    mocks.getAuthenticatedUser.mockRejectedValue(new Error('network unavailable'));
    const res = await aiHandler(request('198.51.100.14'));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: 'Authentication service is temporarily unavailable.' });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it('rejects oversized bodies even when content-length is absent', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'user-large', email: 'large@example.com' });
    const res = await aiHandler(request('198.51.100.15', 'x'.repeat(26_001)));

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toMatchObject({ error: 'AI request is too large' });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with a client error', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'user-malformed', email: 'malformed@example.com' });
    const res = await aiHandler(request('198.51.100.16', '{'));

    expect(res.status).toBe(400);
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it('authorizes Pro from the durable entitlement lookup without using the Free quota', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'user-pro', email: 'pro@example.com' });
    mocks.getEntitlement.mockResolvedValue({ provider: 'stripe', plan: 'lifetime', status: 'active', expires_at: null });
    mocks.generateContent.mockResolvedValue({ text: 'ok' });
    const res = await aiHandler(request('198.51.100.11'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ text: 'ok', plan: 'pro' });
    expect(mocks.supabaseRpc).not.toHaveBeenCalled();
  });

  it('enforces the Free daily limit through the atomic quota RPC', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'user-free', email: 'free@example.com' });
    mocks.getEntitlement.mockResolvedValue(null);
    mocks.supabaseRpc.mockResolvedValue(false);
    const res = await aiHandler(request('198.51.100.12'));

    expect(res.status).toBe(429);
    expect(mocks.supabaseRpc).toHaveBeenCalledWith('reserve_ai_quota', expect.objectContaining({
      p_user_id: 'user-free',
      p_limit: 10,
    }));
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it('releases a reserved Free slot when Gemini fails', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'user-free-2', email: 'free2@example.com' });
    mocks.getEntitlement.mockResolvedValue(null);
    mocks.supabaseRpc.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    mocks.generateContent.mockRejectedValue(new Error('provider failure'));
    const res = await aiHandler(request('198.51.100.13'));

    expect(res.status).toBe(502);
    expect(mocks.supabaseRpc).toHaveBeenNthCalledWith(1, 'reserve_ai_quota', expect.objectContaining({
      p_user_id: 'user-free-2',
      p_limit: 10,
    }));
    expect(mocks.supabaseRpc).toHaveBeenNthCalledWith(2, 'release_ai_quota', expect.objectContaining({
      p_user_id: 'user-free-2',
    }));
  });
});
