import { getEntitlements, isEntitlementActive, requireUser } from './_supabase';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json({ active: false, error: 'Method not allowed' }, 405);

  try {
    const user = await requireUser(request);
    const rows = await getEntitlements(user.id);
    const active = rows.find(isEntitlementActive) ?? null;

    return json({
      active: Boolean(active),
      plan: active?.plan ?? null,
      provider: active?.provider ?? null,
      expires_at: active?.expires_at ?? null,
      user_id: user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return json({ active: false, error: message }, 401);
  }
}
