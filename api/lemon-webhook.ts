import crypto from 'node:crypto';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

function isValidSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(signature, 'utf8');

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ received: false, error: 'Method not allowed' }, 405);
  }

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

  let payload: {
    meta?: { event_name?: string };
    data?: {
      type?: string;
      id?: string;
      attributes?: {
        store_id?: number;
        order_id?: number;
        variant_id?: number;
        status?: string;
        refunded?: boolean;
      };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ received: false, error: 'Invalid JSON payload.' }, 400);
  }

  const eventName =
    payload.meta?.event_name?.trim() ||
    request.headers.get('x-event-name')?.trim() ||
    '';

  const attributes = payload.data?.attributes;
  const payloadStoreId = String(attributes?.store_id ?? '');
  const variantId = String(attributes?.variant_id ?? '');

  if (!eventName || !payload.data?.type || !payload.data?.id) {
    return json({ received: false, error: 'Incomplete webhook payload.' }, 400);
  }

  if (payloadStoreId !== storeId) {
    return json({ received: false, error: 'Webhook store mismatch.' }, 403);
  }

  const knownVariant = variantId === monthlyVariant || variantId === lifetimeVariant;
  if (!knownVariant) {
    return json({ received: false, error: 'Unknown Pro variant.' }, 400);
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
  ]);

  if (!supportedEvents.has(eventName)) {
    return json({ received: true, ignored: true, event: eventName });
  }

  // This endpoint intentionally does not grant or revoke browser-local Pro access.
  // A durable entitlement store must be added before webhook events become the
  // source of truth for billing access. Until then, checkout verification in
  // /api/verify-lemon-order remains the authoritative entitlement check.
  return json({
    received: true,
    processed: false,
    event: eventName,
    resource_id: payload.data.id,
    status: attributes?.status ?? null,
  });
}
