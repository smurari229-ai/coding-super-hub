import { getAuthenticatedUser, upsertEntitlement } from './_supabase.js';
const VERIFY_WINDOW_MS = 60_000;
const VERIFY_MAX_REQUESTS = 20;
const PROVIDER_TIMEOUT_MS = 10_000;
const verifyRateStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  return forwarded.split(',')[0]?.trim() || 'unknown';
}

function verificationRateLimited(request: Request): boolean {
  const ip = getClientIp(request);
  const now = Date.now();
  if (verifyRateStore.size > 5000) {
    for (const [key, entry] of verifyRateStore) {
      if (entry.resetAt <= now) verifyRateStore.delete(key);
    }
  }
  const current = verifyRateStore.get(ip);
  if (!current || current.resetAt <= now) {
    verifyRateStore.set(ip, { count: 1, resetAt: now + VERIFY_WINDOW_MS });
    return false;
  }
  if (current.count >= VERIFY_MAX_REQUESTS) return true;
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

function resolveRequestUrl(request: Request): URL {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = request.headers.get('host')?.trim();
  const forwardedBase =
    (forwardedProto === 'http' || forwardedProto === 'https') && host
      ? forwardedProto + '://' + host
      : 'http://localhost';
  const configuredBase = process.env.APP_URL?.trim();

  if (configuredBase) {
    try {
      const parsed = new URL(configuredBase);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return new URL(request.url, parsed);
      }
    } catch {
      // Ignore malformed APP_URL and use the request-host fallback below.
    }
  }

  return new URL(request.url, forwardedBase);
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ verified: false, error: 'Method not allowed' }, 405);
  }

  if (verificationRateLimited(request)) {
    return json({ verified: false, error: 'Too many verification requests. Please try again later.' }, 429);
  }

  const user = await getAuthenticatedUser(request);
  if (!user?.id || !user.email) return json({ verified: false, error: 'Authenticated email is required.' }, 401);

  const url = resolveRequestUrl(request);
  const sessionId = url.searchParams.get('session_id')?.trim();
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const monthlyPrice = process.env.STRIPE_MONTHLY_PRICE_ID?.trim();
  const lifetimePrice = process.env.STRIPE_LIFETIME_PRICE_ID?.trim();

  if (!secretKey || !monthlyPrice || !lifetimePrice) {
    return json({ verified: false, error: 'Stripe verification is not configured.' }, 503);
  }

  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return json({ verified: false, error: 'Invalid checkout session.' }, 400);
  }

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand%5B%5D=line_items.data.price&expand%5B%5D=subscription`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      return json({ verified: false, error: 'Stripe session verification failed.' }, 502);
    }

    const payload = (await response.json()) as {
      payment_status?: string;
      status?: string;
      mode?: string;
      customer_email?: string | null;
      customer_details?: { email?: string | null } | null;
      subscription?: {
        id?: string;
        status?: string;
        current_period_end?: number | null;
        customer?: string | null;
      } | string | null;
      payment_intent?: string | null;
      line_items?: {
        data?: Array<{ price?: { id?: string } }>;
      };
    };

    const priceId = payload.line_items?.data?.[0]?.price?.id;
    const plan =
      priceId === monthlyPrice
        ? 'monthly'
        : priceId === lifetimePrice
          ? 'lifetime'
          : null;

    const customerEmail = payload.customer_details?.email || payload.customer_email || null;
    if (!customerEmail || customerEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      return json({ verified: false, error: 'Stripe customer email does not match the authenticated account.' }, 403);
    }

    if (payload.payment_status !== 'paid' || payload.status !== 'complete' || !plan) {
      return json({ verified: false, error: 'Stripe payment is not an eligible paid Pro checkout.' }, 403);
    }

    // Monthly Pro must remain backed by a live Stripe subscription. A completed
    // Checkout Session can remain "complete" even after its subscription is
    // cancelled, so session payment status alone is not durable subscription proof.
    if (plan === 'monthly') {
      const subscription =
        typeof payload.subscription === 'object' && payload.subscription !== null
          ? payload.subscription
          : null;
      const subscriptionStatus = subscription?.status;
      const periodEnd = Number(subscription?.current_period_end || 0);
      const subscriptionId = typeof subscription?.id === 'string' ? subscription.id : '';
      const hasValidPeriod = Number.isFinite(periodEnd) && periodEnd > Math.floor(Date.now() / 1000);
      const cancelledButUnexpired = subscriptionStatus === 'canceled' && hasValidPeriod;
      if (
        payload.mode !== 'subscription' ||
        !subscriptionId ||
        !hasValidPeriod ||
        (!['active', 'trialing'].includes(subscriptionStatus ?? '') && !cancelledButUnexpired)
      ) {
        return json({ verified: false, error: 'Stripe Pro subscription is no longer active or has no valid billing period.' }, 403);
      }
    } else if (payload.mode !== 'payment') {
      return json({ verified: false, error: 'Stripe lifetime Pro checkout must use one-time payment mode.' }, 403);
    }

    const subscription = typeof payload.subscription === 'object' && payload.subscription !== null ? payload.subscription : null;
    await upsertEntitlement({
      user_id: user.id,
      provider: 'stripe',
      plan,
      status:
        plan === 'monthly' && subscription?.status === 'canceled'
          ? 'cancelled'
          : 'active',
      expires_at: plan === 'monthly' ? new Date(subscription!.current_period_end * 1000).toISOString() : null,
      stripe_session_id: sessionId,
      stripe_subscription_id: plan === 'monthly' ? subscription!.id : null,
      stripe_payment_intent_id: typeof payload.payment_intent === 'string' ? payload.payment_intent : null,
    });

    return json({ verified: true, plan });
  } catch {
    return json({ verified: false, error: 'Stripe provider unavailable.' }, 502);
  }
}

export function GET(request: Request): Promise<Response> { return handler(request); }
