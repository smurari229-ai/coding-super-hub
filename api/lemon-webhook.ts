import crypto from 'node:crypto';
import { claimWebhookEvent, getEntitlementByField, markWebhookEvent, upsertEntitlement } from './_supabase';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

function isValidSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function variantPlan(variantId: string): 'monthly' | 'lifetime' | null {
  if (variantId === process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID?.trim()) return 'monthly';
  if (variantId === process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID?.trim()) return 'lifetime';
  return null;
}

function dateValue(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ received: false, error: 'Method not allowed' }, 405);

  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
  const monthlyVariant = process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID?.trim();
  const lifetimeVariant = process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID?.trim();

  if (!secret || !storeId || !monthlyVariant || !lifetimeVariant) {
    return json({ received: false, error: 'Webhook is not configured.' }, 503);
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-signature')?.trim() ?? '';
  if (!isValidSignature(rawBody, signature, secret)) {
    return json({ received: false, error: 'Invalid webhook signature.' }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ received: false, error: 'Invalid JSON payload.' }, 400);
  }

  const eventName = String(payload.meta?.event_name || request.headers.get('x-event-name') || '').trim();
  const data = payload.data;
  const attributes = data?.attributes;
  if (!eventName || !data?.type || !data?.id || !attributes) {
    return json({ received: false, error: 'Incomplete webhook payload.' }, 400);
  }

  if (String(attributes.store_id ?? '') !== storeId) {
    return json({ received: false, error: 'Webhook store mismatch.' }, 403);
  }

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
    'subscription_plan_changed',
  ]);

  if (!supportedEvents.has(eventName)) return json({ received: true, ignored: true, event: eventName });

  const eventId = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
  const claimed = await claimWebhookEvent('lemon-squeezy', eventId);
  if (!claimed) return json({ received: true, duplicate: true });

  try {
    const paymentEvent = eventName.startsWith('subscription_payment_');
    const orderId = data.type === 'orders' ? String(data.id) : String(attributes.order_id ?? '');
    const subscriptionId = data.type === 'subscriptions' ? String(data.id) : String(attributes.subscription_id ?? '');

    if (paymentEvent) {
      const existing = subscriptionId ? await getEntitlementByField('lemon_subscription_id', subscriptionId) : null;
      if (!existing) throw new Error('Subscription entitlement not found.');

      if (eventName === 'subscription_payment_refunded') {
        await upsertEntitlement({
          user_id: existing.user_id,
          provider: 'lemon-squeezy',
          plan: existing.plan,
          status: 'refunded',
          expires_at: new Date().toISOString(),
          lemon_order_id: existing.lemon_order_id ?? orderId || null,
          lemon_subscription_id: existing.lemon_subscription_id ?? subscriptionId || null,
          updated_at: new Date().toISOString(),
        });
      }

      await markWebhookEvent('lemon-squeezy', eventId, 'processed');
      return json({ received: true, processed: true, event: eventName, resource_id: data.id });
    }

    const customUserId = String(payload.meta?.custom_data?.user_id || '');
    if (!isUuid(customUserId)) throw new Error('Missing or invalid checkout user association.');

    const variantId = String(attributes.variant_id ?? attributes.first_order_item?.variant_id ?? '');
    const plan = variantPlan(variantId);
    if (!plan) throw new Error('Non-Pro Lemon Squeezy variant.');

    let status: 'active' | 'cancelled' | 'expired' | 'refunded' = 'active';
    let expiresAt: string | null = null;

    if (eventName === 'order_refunded' || eventName === 'subscription_payment_refunded' || attributes.refunded === true) {
      status = 'refunded';
      expiresAt = new Date().toISOString();
    } else if (eventName === 'subscription_expired' || eventName === 'subscription_payment_failed') {
      const endsAt = dateValue(attributes.ends_at);
      if (endsAt && Date.parse(endsAt) > Date.now() && eventName !== 'subscription_expired') {
        status = 'cancelled';
        expiresAt = endsAt;
      } else {
        status = eventName === 'subscription_expired' ? 'expired' : 'active';
        expiresAt = endsAt;
      }
    } else if (
      eventName === 'subscription_cancelled' ||
      attributes.cancelled === true ||
      String(attributes.status || '') === 'cancelled'
    ) {
      const endsAt = dateValue(attributes.ends_at);
      status = endsAt && Date.parse(endsAt) > Date.now() ? 'cancelled' : 'expired';
      expiresAt = endsAt;
    } else if (plan === 'lifetime') {
      status = 'active';
      expiresAt = null;
    } else {
      const endsAt = dateValue(attributes.ends_at);
      status = 'active';
      expiresAt = endsAt;
    }

    await upsertEntitlement({
      user_id: customUserId,
      provider: 'lemon-squeezy',
      plan,
      status,
      expires_at: expiresAt,
      lemon_order_id: orderId || null,
      lemon_subscription_id: subscriptionId || null,
      updated_at: new Date().toISOString(),
    });

    await markWebhookEvent('lemon-squeezy', eventId, 'processed');
    return json({ received: true, processed: true, event: eventName, resource_id: data.id });
  } catch {
    await markWebhookEvent('lemon-squeezy', eventId, 'failed', 'PROCESSING_FAILED');
    return json({ received: false, processed: false, error: 'Webhook processing failed.' }, 500);
  }
}

export default POST;
