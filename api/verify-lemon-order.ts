const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export default {
  async fetch(request: Request) {
    if (request.method !== 'GET') {
      return json({ verified: false, error: 'Method not allowed' }, 405);
    }

    const url = new URL(request.url);
    const orderId = url.searchParams.get('order_id')?.trim();

    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
    const monthlyVariant = process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID?.trim();
    const lifetimeVariant = process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID?.trim();

    if (!apiKey || !storeId || !monthlyVariant || !lifetimeVariant) {
      return json({ verified: false, error: 'Payment verification is not configured.' }, 503);
    }

    if (!orderId || !/^\\d+$/.test(orderId)) {
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

      return json({ verified: true, plan: expectedPlan });
    } catch {
      return json({ verified: false, error: 'Payment provider unavailable.' }, 502);
    }
  },
};
