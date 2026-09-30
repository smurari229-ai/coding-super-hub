import { requireUser } from './_supabase';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

function appUrl(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('APP_URL must use HTTPS.');
    return url.origin;
  }
  return new URL(request.url).origin;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as { provider?: string; plan?: string } | null;
    const provider = body?.provider;
    const plan = body?.plan;

    if (provider !== 'stripe' && provider !== 'lemon-squeezy') {
      return json({ error: 'Unsupported payment provider.' }, 400);
    }
    if (plan !== 'monthly' && plan !== 'lifetime') {
      return json({ error: 'Unsupported Pro plan.' }, 400);
    }

    const baseUrl = appUrl(request);
    const success = `${baseUrl}/?csh_pro=success&provider=${encodeURIComponent(provider)}&plan=${encodeURIComponent(plan)}`;
    const cancel = `${baseUrl}/?csh_pro=cancel&provider=${encodeURIComponent(provider)}&plan=${encodeURIComponent(plan)}`;

    if (provider === 'stripe') {
      const secret = process.env.STRIPE_SECRET_KEY?.trim();
      const priceId = plan === 'monthly'
        ? process.env.STRIPE_MONTHLY_PRICE_ID?.trim()
        : process.env.STRIPE_LIFETIME_PRICE_ID?.trim();

      if (!secret || !priceId) return json({ error: 'Stripe checkout is not configured.' }, 503);

      const params = new URLSearchParams();
      params.set('line_items[0][price]', priceId);
      params.set('line_items[0][quantity]', '1');
      params.set('mode', plan === 'monthly' ? 'subscription' : 'payment');
      params.set('success_url', `${success}&session_id={CHECKOUT_SESSION_ID}`);
      params.set('cancel_url', cancel);
      params.set('client_reference_id', user.id);
      params.set('metadata[user_id]', user.id);
      params.set('metadata[plan]', plan);
      if (plan === 'monthly') {
        params.set('subscription_data[metadata][user_id]', user.id);
        params.set('subscription_data[metadata][plan]', plan);
      } else {
        params.set('payment_intent_data[metadata][user_id]', user.id);
        params.set('payment_intent_data[metadata][plan]', plan);
      }

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const payload = (await response.json().catch(() => ({}))) as { url?: string };
      if (!response.ok || !payload.url) return json({ error: 'Stripe checkout creation failed.' }, 502);
      return json({ provider, plan, checkout_url: payload.url });
    }

    const apiKey = process.env.LEMON_SQUEEZY_API_KEY?.trim();
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
    const variantId = plan === 'monthly'
      ? process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID?.trim()
      : process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID?.trim();

    if (!apiKey || !storeId || !variantId) return json({ error: 'Lemon Squeezy checkout is not configured.' }, 503);

    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email ?? undefined,
              custom: { user_id: user.id, plan },
            },
            product_options: {
              enabled_variants: [Number(variantId)],
              redirect_url: success,
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: storeId } },
            variant: { data: { type: 'variants', id: variantId } },
          },
        },
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      data?: { attributes?: { url?: string } };
    };
    if (!response.ok || !payload.data?.attributes?.url) return json({ error: 'Lemon Squeezy checkout creation failed.' }, 502);

    return json({ provider, plan, checkout_url: payload.data.attributes.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout creation failed.';
    return json({ error: message }, 401);
  }
}
