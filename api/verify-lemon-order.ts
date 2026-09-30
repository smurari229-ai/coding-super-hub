import { getEntitlementByField, isEntitlementActive, requireUser } from './_supabase';

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
    const user = await requireUser(request);
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/orders/${encodeURIComponent(orderId)}`,
      {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      return json({ verified: false, error: 'Order verification failed.' }, 502);
    }

    const payload = (await response.json()) as {
      data?: {
        meta?: { custom_data?: { user_id?: string } };
        attributes?: {
          store_id?: number;
          status?: string;
          refunded?: boolean;
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
      expectedPlan !== null;

    if (!verified) {
      return json({ verified: false, error: 'Order is not an eligible paid Pro order.' }, 403);
    }

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
          attributes?: {
            status?: string;
            variant_id?: number;
            ends_at?: string | null;
          };
        }>;
      };

      const subscription = subscriptionPayload.data?.[0]?.attributes;
      const subscriptionStatus = subscription?.status;
      const subscriptionVariant = String(subscription?.variant_id ?? '');
      const cancelledEndsAt = subscription?.ends_at ? Date.parse(subscription.ends_at) : Number.NaN;
      const cancelledStillValid =
        subscriptionStatus !== 'cancelled' ||
        (Number.isFinite(cancelledEndsAt) && cancelledEndsAt > Date.now());

      const subscriptionValid =
        subscriptionVariant === monthlyVariant &&
        ['on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled'].includes(
          subscriptionStatus ?? ''
        ) &&
        cancelledStillValid;

      if (!subscriptionValid) {
        return json({ verified: false, error: 'Monthly Pro subscription is no longer active.' }, 403);
      }
    }

    const entitlement = await getEntitlementByField('lemon_order_id', orderId);
    if (!entitlement || entitlement.user_id !== user.id || !isEntitlementActive(entitlement)) {
      return json({ verified: false, error: 'Payment is verified, but durable Pro entitlement is still pending.' }, 409);
    }

    return json({ verified: true, plan: entitlement.plan });
  } catch {
    return json({ verified: false, error: 'Payment provider unavailable.' }, 502);
  }
}
