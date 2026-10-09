type AuthUser = { id: string; email?: string | null };

function baseUrl() {
  return process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
}

function publicKey() {
  return (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
}

function secretKey() {
  return (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
}

const SUPABASE_TIMEOUT_MS = 10_000;

function withTimeout(init: RequestInit = {}): RequestInit {
  return { ...init, signal: init.signal ?? AbortSignal.timeout(SUPABASE_TIMEOUT_MS) };
}

function requireBaseAndSecret() {
  const url = baseUrl();
  const key = secretKey();
  if (!url || !key) throw new Error('Supabase server configuration is missing.');
  return { url, key };
}

export function getRequestHeader(req: any, name: string): string {
  if (typeof req?.headers?.get === 'function') {
    return req.headers.get(name) ?? '';
  }
  const value = req?.headers?.[name] ?? req?.headers?.[name.toLowerCase()];
  return typeof value === 'string' ? value : '';
}

export async function getAuthenticatedUser(req: any): Promise<AuthUser | null> {
  const authorization = getRequestHeader(req, 'authorization');
  if (!authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice(7).trim();
  const url = baseUrl();
  const key = publicKey();
  if (!token || !url || !key) return null;

  const response = await fetch(url + '/auth/v1/user', withTimeout({
    headers: { apikey: key, Authorization: 'Bearer ' + token },
  }));
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  if (!user?.id) return null;
  return { id: String(user.id), email: typeof user.email === 'string' ? user.email : null };
}

export async function supabaseRest(path: string, init: RequestInit = {}) {
  const { url, key } = requireBaseAndSecret();
  const headers = new Headers(init.headers);
  headers.set('apikey', key);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(url + '/rest/v1/' + path.replace(/^\//, ''), withTimeout({ ...init, headers }));
}

export async function supabaseRpc(name: string, body: Record<string, unknown>) {
  const response = await supabaseRest('/rpc/' + name, { method: 'POST', body: JSON.stringify(body) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error('Supabase RPC failed.');
  return data;
}

export async function getEntitlement(userId: string) {
  const params = new URLSearchParams({
    user_id: 'eq.' + userId,
    select: 'provider,plan,status,expires_at,stripe_customer_id,stripe_subscription_id,stripe_session_id,stripe_payment_intent_id,lemon_order_id,lemon_subscription_id,updated_at',
    order: 'updated_at.desc',
    limit: '20',
  });
  const response = await supabaseRest('/pro_entitlements?' + params.toString());
  const rows = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(rows)) return null;
  const now = Date.now();
  return rows.find((row: any) => {
    const expiry = typeof row.expires_at === 'string' ? Date.parse(row.expires_at) : Number.NaN;
    const hasFutureExpiry = Number.isFinite(expiry) && expiry > now;
    if (row.status === 'active') {
      // Monthly subscriptions must always have a finite provider-sourced period
      // end. Null expiry remains valid only for a lifetime entitlement.
      if (row.plan === 'monthly') return hasFutureExpiry;
      return !row.expires_at || hasFutureExpiry;
    }
    if (row.status === 'cancelled') return hasFutureExpiry;
    return false;
  }) ?? null;
}

export async function upsertEntitlement(row: Record<string, unknown>) {
  const response = await supabaseRest('/pro_entitlements?on_conflict=user_id,provider', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error('Could not persist Pro entitlement.');
  return Array.isArray(data) ? data[0] : data;
}

export async function updateEntitlementByProviderField(field: string, value: string, patch: Record<string, unknown>) {
  const allowed = new Set(['stripe_session_id','stripe_subscription_id','stripe_payment_intent_id','lemon_order_id','lemon_subscription_id']);
  if (!allowed.has(field)) throw new Error('Invalid entitlement lookup field.');
  const params = new URLSearchParams({ [field]: 'eq.' + value });
  const response = await supabaseRest('/pro_entitlements?' + params.toString(), {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error('Could not update Pro entitlement.');
  return Array.isArray(data) ? data[0] : data;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const { url, key } = requireBaseAndSecret();
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(url + '/auth/v1/admin/users?page=' + page + '&per_page=1000', withTimeout({
      headers: { apikey: key },
    }));
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    const users = Array.isArray(data?.users) ? data.users : [];
    const match = users.find((user: any) => typeof user.email === 'string' && user.email.toLowerCase() === normalized && user.is_anonymous !== true);
    if (match?.id) return String(match.id);
    if (users.length < 1000) break;
  }
  return null;
}

export async function claimWebhookEvent(provider: 'stripe' | 'lemon-squeezy', eventId: string) {
  const insertResponse = await supabaseRest('/billing_webhook_events?on_conflict=provider,event_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ provider, event_id: eventId, status: 'processing' }),
  });
  const inserted = await insertResponse.json().catch(() => null);
  if (!insertResponse.ok) throw new Error('Could not claim webhook event.');
  if (Array.isArray(inserted) && inserted.length > 0) return true;

  const staleBefore = new Date(Date.now() - 5 * 60_000).toISOString();
  const staleParams = new URLSearchParams({
    provider: 'eq.' + provider,
    event_id: 'eq.' + eventId,
    status: 'eq.processing',
    received_at: 'lt.' + staleBefore,
  });
  const staleResponse = await supabaseRest('/billing_webhook_events?' + staleParams.toString(), {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'failed', error_code: 'stale_processing_timeout' }),
  });
  const staleRows = await staleResponse.json().catch(() => null);
  if (!staleResponse.ok) throw new Error('Could not recover stale webhook event.');
  if (Array.isArray(staleRows) && staleRows.length > 0) return true;

  const params = new URLSearchParams({ provider: 'eq.' + provider, event_id: 'eq.' + eventId, status: 'eq.failed' });
  const retryResponse = await supabaseRest('/billing_webhook_events?' + params.toString(), {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'processing', error_code: null, received_at: new Date().toISOString() }),
  });
  const retried = await retryResponse.json().catch(() => null);
  if (!retryResponse.ok) throw new Error('Could not retry webhook event.');
  return Array.isArray(retried) && retried.length > 0;
}

export async function markWebhookProcessed(provider: 'stripe' | 'lemon-squeezy', eventId: string) {
  const params = new URLSearchParams({ provider: 'eq.' + provider, event_id: 'eq.' + eventId });
  const response = await supabaseRest('/billing_webhook_events?' + params.toString(), {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'processed', processed_at: new Date().toISOString(), error_code: null }),
  });
  if (!response.ok) throw new Error('Could not mark webhook event as processed.');
  const rows = await response.json().catch(() => null);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Webhook event was not updated as processed.');
}

export async function markWebhookFailed(provider: 'stripe' | 'lemon-squeezy', eventId: string, errorCode: string) {
  const params = new URLSearchParams({ provider: 'eq.' + provider, event_id: 'eq.' + eventId });
  const response = await supabaseRest('/billing_webhook_events?' + params.toString(), {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'failed', error_code: errorCode.slice(0, 200) }),
  });
  if (!response.ok) throw new Error('Could not mark webhook event as failed.');
  const rows = await response.json().catch(() => null);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Webhook event was not updated as failed.');
}
