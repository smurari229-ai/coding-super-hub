import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claimWebhookEvent: vi.fn(),
  findUserIdByEmail: vi.fn(),
  markWebhookFailed: vi.fn(),
  markWebhookProcessed: vi.fn(),
  upsertEntitlement: vi.fn(),
  updateEntitlementByProviderField: vi.fn(),
}));

vi.mock('../api/_supabase', () => mocks);

import { POST as stripeWebhook } from '../api/stripe-webhook';

const originalEnv = { ...process.env };

function signed(body: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = crypto.createHmac('sha256', secret).update(String(timestamp) + '.' + body, 'utf8').digest('hex');
  return 't=' + timestamp + ',v1=' + signature;
}

function event(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: 'evt_test_1',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', payment_status: 'paid', status: 'complete' } },
    ...overrides,
  });
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'stripe-hook-secret';
  process.env.STRIPE_SECRET_KEY = 'stripe-server-secret';
  process.env.STRIPE_MONTHLY_PRICE_ID = 'price_monthly';
  process.env.STRIPE_LIFETIME_PRICE_ID = 'price_lifetime';
  mocks.claimWebhookEvent.mockReset().mockResolvedValue(true);
  mocks.findUserIdByEmail.mockReset().mockResolvedValue('user-1');
  mocks.markWebhookFailed.mockReset().mockResolvedValue(undefined);
  mocks.markWebhookProcessed.mockReset().mockResolvedValue(undefined);
  mocks.upsertEntitlement.mockReset().mockResolvedValue({});
  mocks.updateEntitlementByProviderField.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('Stripe webhook security and idempotency', () => {
  it('rejects an invalid signature before processing', async () => {
    const body = event();
    const response = await stripeWebhook(new Request('https://example.com/api/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'invalid' },
      body,
    }));
    expect(response.status).toBe(401);
    expect(mocks.claimWebhookEvent).not.toHaveBeenCalled();
  });

  it('accepts a valid Stripe v1 signature when another v1 signature is also present', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('provider unavailable', { status: 503 })));
    const body = event();
    const validHeader = signed(body, 'stripe-hook-secret');
    const headerWithMultipleV1 = validHeader + ',v1=' + '0'.repeat(64);
    const response = await stripeWebhook(new Request('https://example.com/api/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': headerWithMultipleV1 },
      body,
    }));
    // Signature validation passed; the mocked provider lookup then failed safely.
    expect(response.status).toBe(500);
    expect(mocks.claimWebhookEvent).toHaveBeenCalledWith('stripe', 'evt_test_1');
  });

  it('persists a verified lifetime checkout entitlement', async () => {
    const body = event({
      data: {
        object: {
          id: 'cs_test_1',
          payment_status: 'paid',
          status: 'complete',
          customer_details: { email: 'buyer@example.com' },
        },
      },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      payment_status: 'paid',
      status: 'complete',
      mode: 'payment',
      customer: 'cus_test',
      customer_details: { email: 'buyer@example.com' },
      customer_email: 'buyer@example.com',
      payment_intent: 'pi_test_1',
      line_items: { data: [{ price: { id: 'price_lifetime' } }] },
    }), { status: 200 })));

    const response = await stripeWebhook(new Request('https://example.com/api/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signed(body, 'stripe-hook-secret') },
      body,
    }));

    expect(response.status).toBe(200);
    expect(mocks.upsertEntitlement).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      provider: 'stripe',
      plan: 'lifetime',
      status: 'active',
      stripe_session_id: 'cs_test_1',
      stripe_payment_intent_id: 'pi_test_1',
    }));
    expect(mocks.markWebhookProcessed).toHaveBeenCalled();
  });

  it('does not revoke Pro for a partial Stripe refund', async () => {
    const body = event({
      type: 'charge.refunded',
      data: { object: { id: 'ch_test', payment_intent: 'pi_test_1', refunded: false, amount: 1000, amount_refunded: 200 } },
    });
    const response = await stripeWebhook(new Request('https://example.com/api/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signed(body, 'stripe-hook-secret') },
      body,
    }));
    expect(response.status).toBe(200);
    expect(mocks.updateEntitlementByProviderField).not.toHaveBeenCalled();
    expect(mocks.markWebhookProcessed).toHaveBeenCalledWith('stripe', 'evt_test_1');
  });

  it('revokes Pro for a fully refunded Stripe charge', async () => {
    const body = event({
      type: 'charge.refunded',
      data: { object: { id: 'ch_test', payment_intent: 'pi_test_1', refunded: true, amount: 1000, amount_refunded: 1000 } },
    });
    const response = await stripeWebhook(new Request('https://example.com/api/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signed(body, 'stripe-hook-secret') },
      body,
    }));
    expect(response.status).toBe(200);
    expect(mocks.updateEntitlementByProviderField).toHaveBeenCalledWith(
      'stripe_payment_intent_id',
      'pi_test_1',
      expect.objectContaining({ status: 'refunded' }),
    );
  });

  it('does not process a durable duplicate event', async () => {
    mocks.claimWebhookEvent.mockResolvedValue(false);
    const body = event();
    const response = await stripeWebhook(new Request('https://example.com/api/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signed(body, 'stripe-hook-secret') },
      body,
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ duplicate: true });
    expect(mocks.upsertEntitlement).not.toHaveBeenCalled();
  });
  it('returns a retryable 500 even if failed-event status persistence also fails', async () => {
    mocks.markWebhookFailed.mockRejectedValue(new Error('database unavailable'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('provider unavailable', { status: 503 })));
    const body = event();
    const response = await stripeWebhook(new Request('https://example.com/api/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signed(body, 'stripe-hook-secret') },
      body,
    }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      received: false,
      error: 'Stripe webhook processing failed; retry is safe.',
    });
  });

});
