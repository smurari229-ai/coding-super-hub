import crypto from 'node:crypto';
import {
  claimWebhookEvent,
  findUserIdByEmail,
  markWebhookFailed,
  markWebhookProcessed,
  supabaseRest,
  upsertEntitlement,
  updateEntitlementByProviderField,
} from './_supabase.js';

const PROVIDER_TIMEOUT_MS = 10_000;

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

function providerRequest(init: RequestInit = {}): RequestInit {
  return { ...init, signal: init.signal ?? AbortSignal.timeout(PROVIDER_TIMEOUT_MS) };
}

function verifySignature(rawBody: string, header: string, secret: string): boolean {
  const parts = header.split(',').map(part => {
    const separator = part.indexOf('=');
    return separator < 0
      ? [part.trim(), '']
      : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  });
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1]);
  const signatures = parts.filter(([key, value]) => key === 'v1' && value).map(([, value]) => value);
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(String(timestamp) + '.' + rawBody, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return signatures.some(signature => {
    const receivedBuffer = Buffer.from(signature, 'utf8');
    return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  });
}

async function stripeFetch(path: string, secret: string) {
  return fetch('https://api.stripe.com/v1/' + path, providerRequest({
    headers: { Authorization: 'Bearer ' + secret },
  }));
}

async function findUserForCustomer(customerId: string, secret: string): Promise<{ id: string; email: string } | null> {
  if (!customerId) return null;
  const response = await stripeFetch('customers/' + encodeURIComponent(customerId), secret);
  if (!response.ok) return null;
  const customer = await response.json().catch(() => null);
  const email = typeof customer?.email === 'string' ? customer.email : '';
  if (!email) return null;
  const id = await findUserIdByEmail(email);
  return id ? { id, email } : null;
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ received: false, error: 'Method not allowed' }, 405);

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  const monthlyPrice = process.env.STRIPE_MONTHLY_PRICE_ID?.trim();
  const lifetimePrice = process.env.STRIPE_LIFETIME_PRICE_ID?.trim();
  if (!secret || !apiKey || !monthlyPrice || !lifetimePrice) {
    return json({ received: false, error: 'Stripe webhook is not configured.' }, 503);
  }

  const rawBody = await request.text();
  if (rawBody.length > 256_000) return json({ received: false, error: 'Webhook payload is too large.' }, 413);

  const signature = request.headers.get('stripe-signature')?.trim() || '';
  if (!verifySignature(rawBody, signature, secret)) {
    return json({ received: false, error: 'Invalid Stripe webhook signature.' }, 401);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ received: false, error: 'Invalid webhook JSON.' }, 400);
  }

  const eventId = typeof event?.id === 'string' ? event.id : '';
  const eventType = typeof event?.type === 'string' ? event.type : '';
  if (!eventId || !eventType) return json({ received: false, error: 'Incomplete Stripe event.' }, 400);

  const supported = new Set([
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'charge.refunded',
  ]);
  if (!supported.has(eventType)) return json({ received: true, ignored: true, event: eventType });

  let claimed = false;
  try {
    claimed = await claimWebhookEvent('stripe', eventId);
    if (!claimed) return json({ received: true, duplicate: true, event: eventType });
  } catch {
    return json({ received: false, error: 'Webhook idempotency service unavailable.' }, 503);
  }

  try {
    const object = event.data?.object ?? {};

    if (eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded') {
      if (object.payment_status !== 'paid' || object.status !== 'complete') {
        await markWebhookProcessed('stripe', eventId);
        return json({ received: true, processed: true, ignored: true, reason: 'Payment not complete.' });
      }

      const sessionResponse = await stripeFetch(
        'checkout/sessions/' + encodeURIComponent(String(object.id)) +
        '?expand%5B%5D=line_items.data.price&expand%5B%5D=subscription',
        apiKey
      );
      if (!sessionResponse.ok) throw new Error('stripe_session_lookup_failed');
      const session = await sessionResponse.json();

      const priceId = session?.line_items?.data?.[0]?.price?.id;
      const plan = priceId === monthlyPrice ? 'monthly' : priceId === lifetimePrice ? 'lifetime' : null;
      if (!plan) throw new Error('unsupported_price');

      const email = session?.customer_details?.email || session?.customer_email || '';
      const userId = typeof email === 'string' ? await findUserIdByEmail(email) : null;
      if (!userId) throw new Error('user_not_found');

      const subscription = typeof session?.subscription === 'object' && session.subscription ? session.subscription : null;
      await upsertEntitlement({
        user_id: userId,
        provider: 'stripe',
        plan,
        status: 'active',
        expires_at: plan === 'monthly' && subscription?.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        stripe_subscription_id: plan === 'monthly' ? subscription?.id ?? null : null,
        stripe_session_id: String(object.id),
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      });
    } else if (eventType.startsWith('customer.subscription.')) {
      const subscription = object;
      const priceId = subscription?.items?.data?.[0]?.price?.id;
      if (priceId !== monthlyPrice) throw new Error('unsupported_subscription_price');

      const customerId = typeof subscription?.customer === 'string' ? subscription.customer : '';
      const owner = await findUserForCustomer(customerId, apiKey);
      if (!owner) throw new Error('user_not_found');

      const currentPeriodEnd = Number(subscription?.current_period_end || 0);
      const expiresAt = currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null;
      const cancelAtPeriodEnd = subscription?.cancel_at_period_end === true;
      const status = subscription?.status === 'canceled'
        ? 'expired'
        : cancelAtPeriodEnd && expiresAt && Date.parse(expiresAt) > Date.now()
          ? 'cancelled'
          : ['active', 'trialing'].includes(subscription?.status)
            ? 'active'
            : 'expired';

      await upsertEntitlement({
        user_id: owner.id,
        provider: 'stripe',
        plan: 'monthly',
        status,
        expires_at: status === 'active' || status === 'cancelled' ? expiresAt : null,
        stripe_customer_id: customerId || null,
        stripe_subscription_id: String(subscription.id),
      });
    } else if (eventType === 'charge.refunded') {
      // Stripe emits charge.refunded for partial refunds too. Revoke Pro only
      // when the Charge confirms the full amount has been refunded.
      const paymentIntent = typeof object?.payment_intent === 'string' ? object.payment_intent : '';
      if (object?.refunded === true && paymentIntent) {
        await updateEntitlementByProviderField('stripe_payment_intent_id', paymentIntent, {
          status: 'refunded',
          expires_at: new Date().toISOString(),
        });
      }
    }

    await markWebhookProcessed('stripe', eventId);
    return json({ received: true, processed: true, event: eventType });
  } catch (error) {
    try {
      await markWebhookFailed('stripe', eventId, error instanceof Error ? error.message : 'processing_failed');
    } catch {
      // Keep the provider response retryable even if status persistence is unavailable.
      // Stale "processing" claims are recovered by claimWebhookEvent after the timeout.
    }
    return json({ received: false, error: 'Stripe webhook processing failed; retry is safe.' }, 500);
  }
}

export function POST(request: Request): Promise<Response> { return handler(request); }
