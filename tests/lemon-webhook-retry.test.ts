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

import { POST as lemonWebhook } from '../api/lemon-webhook';

const originalEnv = { ...process.env };

function signed(body: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

beforeEach(() => {
  process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'lemon-hook-secret';
  process.env.LEMON_SQUEEZY_STORE_ID = '1';
  process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID = '10';
  process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID = '20';

  mocks.claimWebhookEvent.mockReset().mockResolvedValue(true);
  mocks.findUserIdByEmail.mockReset().mockResolvedValue(null);
  mocks.markWebhookFailed.mockReset().mockResolvedValue(undefined);
  mocks.markWebhookProcessed.mockReset().mockResolvedValue(undefined);
  mocks.upsertEntitlement.mockReset().mockResolvedValue({});
  mocks.updateEntitlementByProviderField.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('Lemon webhook retry safety', () => {
  it('returns non-200 and records failure when a paid order has no matching account', async () => {
    const body = JSON.stringify({
      meta: { event_name: 'order_created' },
      data: {
        type: 'orders',
        id: 'order_123',
        attributes: {
          store_id: 1,
          status: 'paid',
          refunded: false,
          variant_id: 20,
          user_email: 'buyer@example.com',
        },
      },
    });

    const response = await lemonWebhook(new Request('https://example.com/api/lemon-webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': signed(body, 'lemon-hook-secret'),
      },
      body,
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ received: false });
    expect(mocks.upsertEntitlement).not.toHaveBeenCalled();
    expect(mocks.markWebhookFailed).toHaveBeenCalledWith('lemon-squeezy', expect.any(String), 'user_not_found');
  });

  it('does not grant indefinite monthly Pro from an order event without subscription expiry', async () => {
    mocks.findUserIdByEmail.mockResolvedValue('user-1');
    const body = JSON.stringify({
      meta: { event_name: 'order_created' },
      data: {
        type: 'orders',
        id: 'order_monthly_123',
        attributes: {
          store_id: 1,
          status: 'paid',
          refunded: false,
          variant_id: 10,
          user_email: 'buyer@example.com',
        },
      },
    });

    const response = await lemonWebhook(new Request('https://example.com/api/lemon-webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': signed(body, 'lemon-hook-secret'),
      },
      body,
    }));

    expect(response.status).toBe(200);
    expect(mocks.upsertEntitlement).not.toHaveBeenCalled();
    expect(mocks.markWebhookProcessed).toHaveBeenCalledWith('lemon-squeezy', expect.any(String));
  });

  it('returns non-200 and records failure when a subscription has no matching account', async () => {
    const body = JSON.stringify({
      meta: { event_name: 'subscription_created' },
      data: {
        type: 'subscriptions',
        id: 'sub_123',
        attributes: {
          store_id: 1,
          variant_id: 10,
          status: 'active',
          order_id: 123,
          user_email: 'buyer@example.com',
        },
      },
    });

    const response = await lemonWebhook(new Request('https://example.com/api/lemon-webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': signed(body, 'lemon-hook-secret'),
      },
      body,
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ received: false });
    expect(mocks.upsertEntitlement).not.toHaveBeenCalled();
    expect(mocks.markWebhookFailed).toHaveBeenCalledWith('lemon-squeezy', expect.any(String), 'user_not_found');
  });
});
