type SupabaseUser = { id: string; email?: string | null };

type Entitlement = {
  id: string;
  user_id: string;
  provider: 'stripe' | 'lemon-squeezy' | 'manual';
  plan: 'monthly' | 'lifetime';
  status: 'active' | 'cancelled' | 'expired' | 'refunded';
  expires_at: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  lemon_order_id?: string | null;
  lemon_subscription_id?: string | null;
};

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SECRET_KEY = (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''
).trim();

function configError() {
  return !SUPABASE_URL || !SUPABASE_SECRET_KEY;
}

function supabaseHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_SECRET_KEY,
    'content-type': 'application/json',
    ...extra,
  };
}

async function supabaseRest(path: string, init: RequestInit = {}) {
  if (configError()) throw new Error('Supabase server configuration is missing.');
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(supabaseHeaders())) headers.set(key, value);
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
}

export async function requireUser(request: Request): Promise<SupabaseUser> {
  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Authentication required.');

  if (configError()) throw new Error('Supabase server configuration is missing.');

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${match[1]}`,
    },
  });

  if (!response.ok) throw new Error('Invalid or expired authentication session.');

  const user = (await response.json()) as SupabaseUser;
  if (!user?.id) throw new Error('Authenticated user is missing.');
  return user;
}

export async function getEntitlement(userId: string, provider?: string): Promise<Entitlement | null> {
  const params = new URLSearchParams({
    select: '*',
    user_id: `eq.${userId}`,
    limit: '10',
  });
  if (provider) params.set('provider', `eq.${provider}`);

  const response = await supabaseRest(`pro_entitlements?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to read Pro entitlement.');

  const rows = (await response.json()) as Entitlement[];
  return rows[0] ?? null;
}

export async function getEntitlements(userId: string): Promise<Entitlement[]> {
  const params = new URLSearchParams({
    select: '*',
    user_id: `eq.${userId}`,
    limit: '10',
  });
  const response = await supabaseRest(`pro_entitlements?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to read Pro entitlements.');
  return (await response.json()) as Entitlement[];
}

export async function upsertEntitlement(row: Record<string, unknown>): Promise<void> {
  const response = await supabaseRest('pro_entitlements?on_conflict=user_id%2Cprovider', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Failed to persist entitlement: ${response.status} ${detail.slice(0, 200)}`);
  }
}

export async function claimWebhookEvent(provider: 'stripe' | 'lemon-squeezy', eventId: string): Promise<boolean> {
  const response = await supabaseRest('billing_webhook_events', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ provider, event_id: eventId, status: 'processing' }),
  });
  if (!response.ok) throw new Error('Failed to claim webhook event.');
  const rows = (await response.json()) as Array<{ id: string }>;
  return rows.length > 0;
}

export async function markWebhookEvent(eventId: string, status: 'processed' | 'failed', errorCode?: string): Promise<void> {
  const params = new URLSearchParams({ event_id: `eq.${eventId}` });
  await supabaseRest(`billing_webhook_events?${params.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      status,
      error_code: errorCode ?? null,
      processed_at: new Date().toISOString(),
    }),
  });
}

export function isEntitlementActive(row: Entitlement | null): boolean {
  if (!row) return false;
  if (row.plan === 'lifetime' && row.status === 'active' && !row.expires_at) return true;

  if (row.status === 'active') {
    return !row.expires_at || Date.parse(row.expires_at) > Date.now();
  }

  if (row.status === 'cancelled') {
    return Boolean(row.expires_at && Date.parse(row.expires_at) > Date.now());
  }

  return false;
}

export { configError };
