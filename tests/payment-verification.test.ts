import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/_supabase', () => ({
  requireUser: vi.fn(async () => ({ id: '11111111-1111-1111-1111-111111111111', email: 'test@example.com' })),
  getEntitlementByField: vi.fn(async (_field: string, value: string) => ({
    id: 'ent-1',
    user_id: '11111111-1111-1111-1111-111111111111',
    provider: value === '123' ? 'lemon-squeezy' : 'stripe',
    plan: 'lifetime',
    status: 'active',
    expires_at: null,
    stripe_session_id: value.startsWith('cs_') ? value : null,
    lemon_order_id: value === '123' ? value : null,
  })),
  isEntitlementActive: vi.fn(() => true),
  claimWebhookEvent: vi.fn(async () => true),
  markWebhookEvent: vi.fn(async () => undefined),
  upsertEntitlement: vi.fn(async () => undefined),
}));

import lemonHandler from '../api/verify-lemon-order';
import stripeHandler from '../api/verify-stripe-session';
import { POST as lemonWebhook } from '../api/lemon-webhook';

const originalEnv = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('payment verification URL handling', () => {
  it('accepts a relative Vercel request URL for Stripe', async () => {
    process.env.STRIPE_SECRET_KEY = 'test-secret';
    process.env.STRIPE_MONTHLY_PRICE_ID = 'price_monthly';
    process.env.STRIPE_LIFETIME_PRICE_ID = 'price_lifetime';

    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        payment_status: 'paid',
        status: 'complete',
        line_items: { data: [{ price: { id: 'price_monthly' } }] },
      }), { status: 200 })
    ));

    const request = {
      method: 'GET',
      url: '/api/verify-stripe-session?session_id=cs_test123',
      headers: new Headers({ host: 'example.com', 'x-forwarded-proto': 'https' }),
    } as unknown as Request;

    const response = await stripeHandler(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ verified: true, plan: 'monthly' });
  });

  it('falls back safely when APP_URL is malformed', async () => {
    process.env.APP_URL = 'not-a-valid-url';
    process.env.STRIPE_SECRET_KEY = 'test-secret';
    process.env.STRIPE_MONTHLY_PRICE_ID = 'price_monthly';
    process.env.STRIPE_LIFETIME_PRICE_ID = 'price_lifetime';

    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        payment_status: 'paid',
        status: 'complete',
        line_items: { data: [{ price: { id: 'price_lifetime' } }] },
      }), { status: 200 })
    ));

    const request = {
      method: 'GET',
      url: '/api/verify-stripe-session?session_id=cs_test123',
      headers: new Headers({ host: 'example.com', 'x-forwarded-proto': 'https' }),
    } as unknown as Request;

    const response = await stripeHandler(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ verified: true, plan: 'lifetime' });
  });

  it('accepts a relative Vercel request URL for Lemon Squeezy', async () => {
    process.env.LEMON_SQUEEZY_API_KEY = 'test-secret';
    process.env.LEMON_SQUEEZY_STORE_ID = '1';
    process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID = '10';
    process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID = '20';

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { attributes: {
          store_id: 1,
          status: 'paid',
          refunded: false,
          first_order_item: { variant_id: 20 },
        } },
      }), { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const request = {
      method: 'GET',
      url: '/api/verify-lemon-order?order_id=123',
      headers: new Headers({ host: 'example.com', 'x-forwarded-proto': 'https' }),
    } as unknown as Request;

    const response = await lemonHandler(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ verified: true, plan: 'lifetime' });
  });
});

describe('Lemon Squeezy webhook signature handling', () => {
  const secret = 'webhook-test-secret';

  function configuredWebhookEnv() {
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = secret;
    process.env.LEMON_SQUEEZY_STORE_ID = '1';
    process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID = '10';
    process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID = '20';
  }

  function signedRequest(body: string, signature = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')) {
    return new Request('https://example.com/api/lemon-webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': signature,
      },
      body,
    });
  }

  it('rejects an invalid signature before processing the payload', async () => {
    configuredWebhookEnv();
    const body = JSON.stringify({
      meta: { event_name: 'order_created' },
      data: {
        type: 'orders',
        id: '123',
        attributes: { store_id: 1, variant_id: 20 },
      },
    });

    const response = await lemonWebhook(signedRequest(body, 'invalid'));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      received: false,
      error: 'Invalid webhook signature.',
    });
  });

  it('accepts a valid signed webhook and does not grant browser-local entitlement', async () => {
    configuredWebhookEnv();
    const body = JSON.stringify({
      meta: { event_name: 'order_created' },
      data: {
        type: 'orders',
        id: '123',
        attributes: { store_id: 1, variant_id: 20 },
      },
    });

    const response = await lemonWebhook(signedRequest(body));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      processed: false,
      event: 'order_created',
    });
  });
});
