import crypto from 'node:crypto';
import { claimWebhookEvent, getEntitlementByField, markWebhookEvent, upsertEntitlement } from './_supabase';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

function verifyStripeSignature(rawBody: string, header: string, secret: string): boolean {
  const parts = header.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');

  return signatures.some((received) => {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(received, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

async function stripeGet(path: string) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) throw new Error('Stripe is not configured.');
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Stripe resource lookup failed.');
  return payload as Record<string, any>;
}

function configuredPlan(priceId: string): 'monthly' | 'lifetime' | null {
  if (priceId && priceId === process.env.STRIPE_MONTHLY_PRICE_ID?.trim()) return 'monthly';
  if (priceId && priceId === process.env.STRIPE_LIFETIME_PRICE_ID?.trim()) return 'lifetime';
  return null;
}

function isoFromUnix(value: unknown): string | null {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

async function persistStripeEntitlement(input: {
  userId: string;
  plan: 'monthly' | 'lifetime';
  status: 'active' | 'cancelled' | 'expired' | 'refunded';
  expiresAt?: string | null;
  sessionId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  paymentIntentId?: string | null;
}) {
  await upsertEntitlement({
    user_id: input.userId,
    provider: 'stripe',
    plan: input.plan,
    status: input.status,
    expires_at: input.expiresAt ?? null,
    stripe_session_id: input.sessionId ?? null,
    stripe_customer_id: input.customerId ?? null,
    stripe_subscription_id: input.subscriptionId ?? null,
    stripe_payment_intent_id: input.paymentIntentId ?? null,
    updated_at: new Date().toISOString(),
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ received: false, error: 'Method not allowed' }, 405);

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature')?.trim() || '';

  if (!secret) return json({ received: false, error: 'Stripe webhook is not configured.' }, 503);
  if (!verifyStripeSignature(rawBody, signature, secret)) {
    return json({ received: false, error: 'Invalid Stripe webhook signature.' }, 400);
  }

  let event: { id?: string; type?: string; data?: { object?: Record<string, any> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ received: false, error: 'Invalid JSON payload.' }, 400);
  }

  const eventId = event.id?.trim();
  if (!eventId || !event.type) return json({ received: false, error: 'Incomplete Stripe event.' }, 400);

  const claimed = await claimWebhookEvent('stripe', eventId);
  if (!claimed) return json({ received: true, duplicate: true });

  try {
    const object = event.data?.object ?? {};

    if (event.type === 'checkout.session.completed') {
      const session = await stripeGet(
        `checkout/sessions/${encodeURIComponent(String(object.id || ''))}?expand%5B%5D=line_items.data.price&expand%5B%5D=subscription`
      );
      const userId = String(session.metadata?.user_id || session.client_reference_id || '');
      const priceId = String(session.line_items?.data?.[0]?.price?.id || '');
      const plan = configuredPlan(priceId);

      if (!/^[0-9a-f-]{36}$/i.test(userId) || !plan || session.payment_status !== 'paid' || session.status !== 'complete') {
        throw new Error('Invalid or ineligible Stripe checkout session.');
      }

      const subscription = session.subscription && typeof session.subscription === 'object' ? session.subscription : null;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : subscription?.id;
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      const status = plan === 'lifetime' ? 'active' : (
        ['active', 'trialing'].includes(String(subscription?.status || ''))
          ? 'active'
          : String(subscription?.status || '') === 'canceled'
            ? 'expired'
            : 'active'
      );
      const expiresAt = plan === 'monthly' ? isoFromUnix(subscription?.current_period_end) : null;

      await persistStripeEntitlement({
        userId,
        plan,
        status,
        expiresAt,
        sessionId: String(session.id || ''),
        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        subscriptionId,
        paymentIntentId,
      });
    } else if (
      ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)
    ) {
      const subscription = object;
      const userId = String(subscription.metadata?.user_id || '');
      const priceId = String(subscription.items?.data?.[0]?.price?.id || '');
      const plan = configuredPlan(priceId);

      if (!/^[0-9a-f-]{36}$/i.test(userId) || plan !== 'monthly') {
        throw new Error('Invalid Stripe subscription ownership or plan.');
      }

      const providerStatus = String(subscription.status || '');
      const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;
      const currentPeriodEnd = isoFromUnix(subscription.current_period_end);
      let status: 'active' | 'cancelled' | 'expired';

      if (event.type === 'customer.subscription.deleted' || providerStatus === 'canceled') {
        status = currentPeriodEnd && Date.parse(currentPeriodEnd) > Date.now() ? 'cancelled' : 'expired';
      } else if (cancelAtPeriodEnd) {
        status = currentPeriodEnd && Date.parse(currentPeriodEnd) > Date.now() ? 'cancelled' : 'expired';
      } else if (['active', 'trialing'].includes(providerStatus)) {
        status = 'active';
      } else {
        status = 'expired';
      }

      await persistStripeEntitlement({
        userId,
        plan,
        status,
        expiresAt: currentPeriodEnd,
        customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
        subscriptionId: String(subscription.id || ''),
      });
    } else if (event.type === 'charge.refunded') {
      const paymentIntentId = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id;
      if (paymentIntentId) {
        const existing = await getEntitlementByField('stripe_payment_intent_id', paymentIntentId);
        if (existing) {
          await persistStripeEntitlement({
            userId: existing.user_id,
            plan: existing.plan,
            status: 'refunded',
            expiresAt: new Date().toISOString(),
            sessionId: existing.stripe_session_id,
            customerId: existing.stripe_customer_id,
            subscriptionId: existing.stripe_subscription_id,
            paymentIntentId,
          });
        }
      }
    }

    await markWebhookEvent('stripe', eventId, 'processed');
    return json({ received: true, processed: true, event: event.type });
  } catch {
    await markWebhookEvent('stripe', eventId, 'failed', 'PROCESSING_FAILED');
    return json({ received: false, processed: false, error: 'Stripe webhook processing failed.' }, 500);
  }
}
