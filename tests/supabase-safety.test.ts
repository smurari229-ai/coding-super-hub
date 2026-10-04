import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Supabase server helper safety', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'server-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it('adds a bounded AbortSignal to REST requests', async () => {
    let captured: RequestInit | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      captured = init;
      return new Response('[]', { status: 200 });
    }));

    const { supabaseRest } = await import('../api/_supabase');
    await supabaseRest('/pro_entitlements?limit=1');

    expect(captured?.signal).toBeInstanceOf(AbortSignal);
  });

  it('recovers a stale processing webhook before retrying it', async () => {
    const calls: Array<{ url: string; method: string; body: string }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? init.body : '',
      });

      if (calls.length === 1) return new Response('[]', { status: 200 });
      if (calls.length === 2) return new Response(JSON.stringify([{ id: 'stale-1' }]), { status: 200 });
      return new Response('[]', { status: 200 });
    }));

    const { claimWebhookEvent } = await import('../api/_supabase');
    await expect(claimWebhookEvent('stripe', 'evt_stale')).resolves.toBe(true);

    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe('POST');
    expect(calls[1].method).toBe('PATCH');
    expect(calls[1].body).toContain('stale_processing_timeout');
  });

  it('reclaims a previously failed webhook event', async () => {
    const calls: Array<{ method: string; body: string }> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push({
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? init.body : '',
      });

      if (calls.length === 1) return new Response('[]', { status: 200 });
      if (calls.length === 2) return new Response('[]', { status: 200 });
      return new Response(JSON.stringify([{ id: 'failed-1' }]), { status: 200 });
    }));

    const { claimWebhookEvent } = await import('../api/_supabase');
    await expect(claimWebhookEvent('lemon-squeezy', 'evt_failed')).resolves.toBe(true);

    expect(calls).toHaveLength(3);
    expect(calls[2].method).toBe('PATCH');
    expect(calls[2].body).toContain('"status":"processing"');
    expect(calls[2].body).toContain('"error_code":null');
  });

  it('does not claim an already processed/non-retryable event', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push(init?.method ?? 'GET');
      return new Response('[]', { status: 200 });
    }));

    const { claimWebhookEvent } = await import('../api/_supabase');
    await expect(claimWebhookEvent('stripe', 'evt_done')).resolves.toBe(false);

    expect(calls).toEqual(['POST', 'PATCH', 'PATCH']);
  });
});
