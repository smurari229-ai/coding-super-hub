import { describe, expect, it, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getEntitlement: vi.fn(),
  supabaseRpc: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({ models: { generateContent: mocks.generateContent } })),
}));

vi.mock('../api/_supabase', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
  getEntitlement: mocks.getEntitlement,
  supabaseRpc: mocks.supabaseRpc,
}));

import aiHandler from '../api/ai';

function request(ip: string) {
  return {
    method: 'POST',
    headers: { 'content-length': '50', 'x-forwarded-for': ip },
    body: { code: 'const x = 1;', instruction: 'Explain it.' },
    socket: { remoteAddress: ip },
  } as any;
}

function response() {
  return {
    statusCode: 0,
    body: null as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    setHeader(name: string, value: string) { this.headers[name] = value; return this; },
    json(body: unknown) { this.body = body; return this; },
  } as any;
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
    const res = response();

    await aiHandler(request('198.51.100.10'), res);

    expect(res.statusCode).toBe(401);
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it('authorizes Pro from the durable entitlement lookup without using the Free quota', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'user-pro', email: 'pro@example.com' });
    mocks.getEntitlement.mockResolvedValue({ provider: 'stripe', plan: 'lifetime', status: 'active', expires_at: null });
    mocks.generateContent.mockResolvedValue({ text: 'ok' });
    const res = response();

    await aiHandler(request('198.51.100.11'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ text: 'ok', plan: 'pro' });
    expect(mocks.supabaseRpc).not.toHaveBeenCalled();
  });

  it('enforces the Free daily limit through the atomic quota RPC', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'user-free', email: 'free@example.com' });
    mocks.getEntitlement.mockResolvedValue(null);
    mocks.supabaseRpc.mockResolvedValue(false);
    const res = response();

    await aiHandler(request('198.51.100.12'), res);

    expect(res.statusCode).toBe(429);
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
    const res = response();

    await aiHandler(request('198.51.100.13'), res);

    expect(res.statusCode).toBe(502);
    expect(mocks.supabaseRpc).toHaveBeenNthCalledWith(1, 'reserve_ai_quota', expect.objectContaining({
      p_user_id: 'user-free-2',
      p_limit: 10,
    }));
    expect(mocks.supabaseRpc).toHaveBeenNthCalledWith(2, 'release_ai_quota', expect.objectContaining({
      p_user_id: 'user-free-2',
    }));
  });
});
