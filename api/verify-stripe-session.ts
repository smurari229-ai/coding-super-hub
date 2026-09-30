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
    const user = await requireUser(request);
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand%5B%5D=line_items.data.price`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    if (!response.ok) {
      return json({ verified: false, error: 'Stripe session verification failed.' }, 502);
    }

    const payload = (await response.json()) as {
      id?: string;
      payment_status?: string;
      status?: string;
      client_reference_id?: string | null;
      metadata?: { user_id?: string; plan?: string };
      line_items?: {
        data?: Array<{ price?: { id?: string } }>;
      };
    };

    const priceId = payload.line_items?.data?.[0]?.price?.id;
    const ownerId = payload.metadata?.user_id || payload.client_reference_id || '';
    if (ownerId !== user.id) {
      return json({ verified: false, error: 'Checkout session ownership mismatch.' }, 403);
    }
    const plan =
      priceId === monthlyPrice
        ? 'monthly'
        : priceId === lifetimePrice
          ? 'lifetime'
          : null;

    if (payload.payment_status !== 'paid' || payload.status !== 'complete' || !plan) {
      return json({ verified: false, error: 'Stripe payment is not an eligible paid Pro checkout.' }, 403);
    }

    const entitlement = await getEntitlementByField('stripe_session_id', sessionId);
    if (!entitlement || entitlement.user_id !== user.id || !isEntitlementActive(entitlement)) {
      return json({ verified: false, error: 'Payment is verified, but durable Pro entitlement is still pending.' }, 409);
    }

    return json({ verified: true, plan: entitlement.plan });
  } catch {
    return json({ verified: false, error: 'Stripe provider unavailable.' }, 502);
  }
}
