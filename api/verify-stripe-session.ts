const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ verified: false, error: 'Method not allowed' }, 405);
  }

  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = request.headers.get('host')?.trim();
  const fallbackBase = process.env.APP_URL?.trim() || (forwardedProto && host ? forwardedProto + '://' + host : 'http://localhost');
  const url = new URL(request.url, fallbackBase);
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
      payment_status?: string;
      status?: string;
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

    if (payload.payment_status !== 'paid' || payload.status !== 'complete' || !plan) {
      return json({ verified: false, error: 'Stripe payment is not an eligible paid Pro checkout.' }, 403);
    }

    return json({ verified: true, plan });
  } catch {
    return json({ verified: false, error: 'Stripe provider unavailable.' }, 502);
  }
}
