import { afterEach, describe, expect, it, vi } from 'vitest';
import lemonHandler from '../api/verify-lemon-order';
import stripeHandler from '../api/verify-stripe-session';

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
