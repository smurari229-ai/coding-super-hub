import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as lemonHandler } from '../api/verify-lemon-order';
import { GET as stripeHandler } from '../api/verify-stripe-session';
import { POST as lemonWebhook } from '../api/lemon-webhook';

vi.mock('../api/_supabase', () => ({
  getAuthenticatedUser: vi.fn(async () => ({ id: 'user-1', email: 'buyer@example.com' })),
  upsertEntitlement: vi.fn(async (row: unknown) => row),
  claimWebhookEvent: vi.fn(async () => true),
  markWebhookProcessed: vi.fn(async () => undefined),
  markWebhookFailed: vi.fn(async () => undefined),
  findUserIdByEmail: vi.fn(async () => 'user-1'),
  updateEntitlementByProviderField: vi.fn(async () => undefined),
  supabaseRest: vi.fn(),
  supabaseRpc: vi.fn(),
}));

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
        mode: 'subscription',
        customer_details: { email: 'buyer@example.com' },
        subscription: { id: 'sub_test', status: 'active', current_period_end: 2000000000 },
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

  it('preserves monthly Pro through a Stripe cancellation that is still within the paid period', async () => {
    process.env.STRIPE_SECRET_KEY = 'test-secret';
    process.env.STRIPE_MONTHLY_PRICE_ID = 'price_monthly';
    process.env.STRIPE_LIFETIME_PRICE_ID = 'price_lifetime';

    const futurePeriodEnd = Math.floor(Date.now() / 1000) + 86400;
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({
        payment_status: 'paid',
        status: 'complete',
        mode: 'subscription',
        customer_details: { email: 'buyer@example.com' },
        subscription: { id: 'sub_test', status: 'canceled', current_period_end: futurePeriodEnd },
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
        mode: 'payment',
        customer_details: { email: 'buyer@example.com' },
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
          user_email: 'buyer@example.com',
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
        attributes: { store_id: 1, variant_id: 20, user_email: 'buyer@example.com' },
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
      processed: true,
      event: 'order_created',
    });
  });
});
