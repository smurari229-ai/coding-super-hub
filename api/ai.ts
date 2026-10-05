import { GoogleGenAI } from '@google/genai';
import { getAuthenticatedUser, getEntitlement, supabaseRpc } from './_supabase.js';

const MAX_CODE_LENGTH = 20_000;
const MAX_INSTRUCTION_LENGTH = 4_000;
const MAX_BODY_LENGTH = 26_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_RESPONSE_LENGTH = 12_000;
const FREE_DAILY_LIMIT = 10;
const WINDOW_MS = 60_000;

type RateEntry = { count: number; resetAt: number };
const rateStore = new Map<string, RateEntry>();

function getClientIp(req: any): string {
  const forwarded = typeof req?.headers?.['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : '';
  return forwarded.split(',')[0].trim() || req?.socket?.remoteAddress || 'unknown';
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (rateStore.size > 5000) {
    for (const [key, entry] of rateStore) {
      if (entry.resetAt <= now) rateStore.delete(key);
    }
  }
  const current = rateStore.get(ip);
  if (!current || current.resetAt <= now) {
    rateStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return true;
  current.count += 1;
  return false;
}

function send(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'allow': 'POST' },
    });
  }

  const contentLength = Number(req.headers?.['content-length'] || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_LENGTH) {
    return send( 413, { error: 'AI request is too large' });
  }

  const ip = getClientIp(req);
  if (rateLimited(ip)) {
    return send( 429, { error: 'Too many AI requests. Please wait before trying again.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send( 503, { error: 'AI service is not configured on the server.' });

  const user = await getAuthenticatedUser(req);
  if (!user?.id) return send( 401, { error: 'Sign in is required before using AI Copilot.' });

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return send( 400, { error: 'Invalid request body' });

  const code = typeof body.code === 'string' ? body.code : '';
  const instruction = typeof body.instruction === 'string' ? body.instruction : '';
  const customPrompt = typeof body.customPrompt === 'string' ? body.customPrompt : '';

  if (!code.trim()) return send( 400, { error: 'Code input is required' });
  if (code.length > MAX_CODE_LENGTH) return send( 413, { error: 'Code input exceeds the 20,000 character limit' });
  if (instruction.length > MAX_INSTRUCTION_LENGTH || customPrompt.length > MAX_INSTRUCTION_LENGTH) return send( 413, { error: 'Instruction input is too large' });

  let entitlement = null;
  try {
    entitlement = await getEntitlement(user.id);
  } catch {
    return send( 503, { error: 'Billing authorization is temporarily unavailable.' });
  }

  const isPro = Boolean(entitlement);
  const usageDate = new Date().toISOString().slice(0, 10);
  let quotaReserved = false;

  if (!isPro) {
    try {
      quotaReserved = Boolean(await supabaseRpc('reserve_ai_quota', {
        p_user_id: user.id,
        p_usage_date: usageDate,
        p_limit: FREE_DAILY_LIMIT,
      }));
    } catch {
      return send( 503, { error: 'AI quota service is temporarily unavailable.' });
    }

    if (!quotaReserved) {
      return send( 429, { error: 'Free AI limit reached (10 successful calls today). Upgrade to Pro for expanded Copilot access.' });
    }
  }

  const prompt = [
    instruction || 'Analyze the supplied code carefully.',
    customPrompt ? 'Additional instruction: ' + customPrompt : '',
    '',
    'Code:',
    '~~~',
    code,
    '~~~'
  ].filter(Boolean).join('\n');

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { maxOutputTokens: 1400, temperature: 0.2 }
    });
    const text = typeof result.text === 'string' ? result.text : '';
    if (!text) throw new Error('empty-response');
    const boundedText = text.length > MAX_RESPONSE_LENGTH
      ? text.slice(0, MAX_RESPONSE_LENGTH) + '\n\n[Response truncated at the 12,000 character safety limit.]'
      : text;
    return send( 200, { text: boundedText, plan: isPro ? 'pro' : 'free' });
  } catch {
    if (quotaReserved) {
      try {
        await supabaseRpc('release_ai_quota', { p_user_id: user.id, p_usage_date: usageDate });
      } catch {}
    }
    return send( 502, { error: 'AI provider request failed' });
  }
}

export default handler;
