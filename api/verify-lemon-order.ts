import { getAuthenticatedUser, upsertEntitlement } from './_supabase';
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

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ verified: false, error: 'Method not allowed' }, 405);
  }

  if (verificationRateLimited(request)) {
    return json({ verified: false, error: 'Too many verification requests. Please try again later.' }, 429);
  }

  const user = await getAuthenticatedUser(request);
  if (!user?.id || !user.email) return json({ verified: false, error: 'Authenticated email is required.' }, 401);

  const url = resolveRequestUrl(request);
  const orderId = url.searchParams.get('order_id')?.trim();

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
  const monthlyVariant = process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID?.trim();
  const lifetimeVariant = process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID?.trim();

  if (!apiKey || !storeId || !monthlyVariant || !lifetimeVariant) {
    return json({ verified: false, error: 'Payment verification is not configured.' }, 503);
  }

  if (!orderId || !/^\d+$/.test(orderId)) {
    return json({ verified: false, error: 'Invalid order id.' }, 400);
  }

  try {
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/orders/${encodeURIComponent(orderId)}`,
      {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      return json({ verified: false, error: 'Order verification failed.' }, 502);
    }

    const payload = (await response.json()) as {
      data?: {
        attributes?: {
          store_id?: number;
          status?: string;
          refunded?: boolean;
          user_email?: string;
          first_order_item?: { variant_id?: number };
        };
      };
    };

    const attrs = payload.data?.attributes;
    const variantId = String(attrs?.first_order_item?.variant_id ?? '');
    const expectedPlan =
      variantId === monthlyVariant
        ? 'monthly'
        : variantId === lifetimeVariant
          ? 'lifetime'
          : null;

    const verified =
      String(attrs?.store_id ?? '') === storeId &&
      attrs?.status === 'paid' &&
      attrs?.refunded !== true &&
      typeof attrs?.user_email === 'string' && attrs.user_email.trim().toLowerCase() === user.email.trim().toLowerCase() &&
      expectedPlan !== null;

    if (!verified) {
      return json({ verified: false, error: 'Order is not an eligible paid Pro order.' }, 403);
    }

    let subscriptionId: string | null = null;
    let subscriptionAttrs: any = null;

    if (expectedPlan === 'monthly') {
      const subscriptionResponse = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions?filter[order_id]=${encodeURIComponent(orderId)}&page[size]=1`,
        {
          headers: {
            Accept: 'application/vnd.api+json',
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!subscriptionResponse.ok) {
        return json({ verified: false, error: 'Subscription verification failed.' }, 502);
      }

      const subscriptionPayload = (await subscriptionResponse.json()) as {
        data?: Array<{
          id?: string;
          attributes?: {
            status?: string;
            variant_id?: number;
            ends_at?: string | null;
          };
        }>;
      };

      const subscription = subscriptionPayload.data?.[0]?.attributes;
      subscriptionId = subscriptionPayload.data?.[0]?.id ? String(subscriptionPayload.data[0].id) : null;
      subscriptionAttrs = subscription;
      const subscriptionStatus = subscription?.status;
      const subscriptionVariant = String(subscription?.variant_id ?? '');
      const cancelledEndsAt = subscription?.ends_at ? Date.parse(subscription.ends_at) : Number.NaN;
      const cancelledStillValid =
        subscriptionStatus !== 'cancelled' ||
        (Number.isFinite(cancelledEndsAt) && cancelledEndsAt > Date.now());

      const subscriptionValid =
        subscriptionVariant === monthlyVariant &&
        ['on_trial', 'active', 'cancelled'].includes(subscriptionStatus ?? '') &&
        cancelledStillValid;

      if (!subscriptionValid) {
        return json({ verified: false, error: 'Monthly Pro subscription is no longer active.' }, 403);
      }
    }

    await upsertEntitlement({
      user_id: user.id,
      provider: 'lemon-squeezy',
      plan: expectedPlan,
      status: 'active',
      expires_at: expectedPlan === 'monthly' && subscriptionAttrs?.status === 'cancelled' ? subscriptionAttrs?.ends_at ?? null : null,
      lemon_order_id: orderId,
      lemon_subscription_id: subscriptionId || null,
    });

    return json({ verified: true, plan: expectedPlan });
  } catch {
    return json({ verified: false, error: 'Payment provider unavailable.' }, 502);
  }
}
