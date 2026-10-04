import crypto from 'node:crypto';
import {
  claimWebhookEvent,
  findUserIdByEmail,
  markWebhookFailed,
  markWebhookProcessed,
  upsertEntitlement,
  updateEntitlementByProviderField,
} from './_supabase';

const WEBHOOK_WINDOW_MS = 60_000;
const WEBHOOK_MAX_REQUESTS = 60;
const PROVIDER_TIMEOUT_MS = 10_000;
const webhookRateStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  return forwarded.split(',')[0]?.trim() || 'unknown';
}

function webhookRateLimited(request: Request): boolean {
  const ip = getClientIp(request);
  const now = Date.now();
  if (webhookRateStore.size > 5000) {
    for (const [key, entry] of webhookRateStore) {
      if (entry.resetAt <= now) webhookRateStore.delete(key);
    }
  }
  const current = webhookRateStore.get(ip);
  if (!current || current.resetAt <= now) {
    webhookRateStore.set(ip, { count: 1, resetAt: now + WEBHOOK_WINDOW_MS });
    return false;
  }
  if (current.count >= WEBHOOK_MAX_REQUESTS) return true;
  current.count += 1;
  return false;
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

function isValidSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(signature, 'utf8');
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ received: false, error: 'Method not allowed' }, 405);
  if (webhookRateLimited(request)) return json({ received: false, error: 'Too many webhook requests.' }, 429);

  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
  const monthlyVariant = process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID?.trim();
  const lifetimeVariant = process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID?.trim();
  if (!secret || !storeId || !monthlyVariant || !lifetimeVariant) {
    return json({ received: false, error: 'Webhook is not configured.' }, 503);
  }

  const rawBody = await request.text();
  if (rawBody.length > 256_000) return json({ received: false, error: 'Webhook payload is too large.' }, 413);
  const signature = request.headers.get('x-signature')?.trim() ?? '';
  if (!isValidSignature(rawBody, signature, secret)) return json({ received: false, error: 'Invalid webhook signature.' }, 401);

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ received: false, error: 'Invalid JSON payload.' }, 400);
  }

  const eventName = String(payload?.meta?.event_name || request.headers.get('x-event-name') || '').trim();
  const resourceId = String(payload?.data?.id || '').trim();
  const resourceType = String(payload?.data?.type || '').trim();
  if (!eventName || !resourceId || !resourceType) return json({ received: false, error: 'Incomplete webhook payload.' }, 400);

  const supportedEvents = new Set([
    'order_created',
    'order_refunded',
    'subscription_created',
    'subscription_updated',
    'subscription_cancelled',
    'subscription_resumed',
    'subscription_expired',
    'subscription_paused',
    'subscription_unpaused',
    'subscription_payment_success',
    'subscription_payment_failed',
    'subscription_payment_recovered',
    'subscription_payment_refunded',
  ]);
  if (!supportedEvents.has(eventName)) return json({ received: true, ignored: true, event: eventName });

  const attrs = payload.data?.attributes ?? {};
  const payloadStoreId = String(attrs.store_id ?? '');
  if (payloadStoreId !== storeId) return json({ received: false, error: 'Webhook store mismatch.' }, 403);

  const variantId = String(attrs.variant_id ?? attrs.first_order_item?.variant_id ?? '');
  if (variantId && variantId !== monthlyVariant && variantId !== lifetimeVariant) {
    return json({ received: true, ignored: true, event: eventName, reason: 'Non-Pro variant' });
  }

  const eventId = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');

  try {
    if (!(await claimWebhookEvent('lemon-squeezy', eventId))) {
      return json({ received: true, duplicate: true, event: eventName });
    }
  } catch {
    return json({ received: false, error: 'Webhook idempotency service unavailable.' }, 503);
  }

  try {
    const email = typeof attrs.user_email === 'string' ? attrs.user_email.trim().toLowerCase() : '';
    const userId = email ? await findUserIdByEmail(email) : null;

    if (eventName === 'subscription_payment_failed') {
      await markWebhookProcessed('lemon-squeezy', eventId);
      return json({ received: true, processed: true, event: eventName });
    }

    if (eventName === 'order_refunded' || eventName === 'subscription_payment_refunded') {
      const field = eventName === 'order_refunded' ? 'lemon_order_id' : 'lemon_subscription_id';
      await updateEntitlementByProviderField(field, resourceId, {
        status: 'refunded',
        expires_at: new Date().toISOString(),
      });
    } else if (resourceType === 'orders' && eventName === 'order_created') {
      const plan = variantId === monthlyVariant ? 'monthly' : variantId === lifetimeVariant ? 'lifetime' : null;
      if (plan && attrs.status === 'paid' && attrs.refunded !== true && userId) {
        await upsertEntitlement({
          user_id: userId,
          provider: 'lemon-squeezy',
          plan,
          status: 'active',
          expires_at: null,
          lemon_order_id: resourceId,
        });
      }
    } else if (resourceType === 'subscriptions') {
      const plan = variantId === monthlyVariant ? 'monthly' : variantId === lifetimeVariant ? 'lifetime' : null;
      if (!plan) throw new Error('unsupported_subscription_variant');

      const status = String(attrs.status || '');
      const endsAt = typeof attrs.ends_at === 'string' ? attrs.ends_at : null;
      const endsInFuture = Boolean(endsAt && Date.parse(endsAt) > Date.now());

      let entitlementStatus: 'active' | 'cancelled' | 'expired' = 'expired';
      let expiresAt: string | null = null;

      if (['on_trial', 'active'].includes(status) && attrs.cancelled !== true) {
        entitlementStatus = 'active';
      } else if (status === 'cancelled' && endsInFuture) {
        entitlementStatus = 'cancelled';
        expiresAt = endsAt;
      }

      if (userId) {
        await upsertEntitlement({
          user_id: userId,
          provider: 'lemon-squeezy',
          plan,
          status: entitlementStatus,
          expires_at: expiresAt,
          lemon_order_id: attrs.order_id ? String(attrs.order_id) : null,
          lemon_subscription_id: resourceId,
        });
      }
    }

    await markWebhookProcessed('lemon-squeezy', eventId);
    return json({ received: true, processed: true, event: eventName });
  } catch (error) {
    await markWebhookFailed('lemon-squeezy', eventId, error instanceof Error ? error.message : 'processing_failed');
    return json({ received: false, error: 'Webhook processing failed; retry is safe.' }, 500);
  }
}
