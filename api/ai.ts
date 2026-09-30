import { getEntitlements, isEntitlementActive, requireUser } from './_supabase';
import { GoogleGenAI } from '@google/genai';

const MAX_CODE_LENGTH = 20_000;
const MAX_INSTRUCTION_LENGTH = 4_000;
const MAX_BODY_LENGTH = 26_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const WINDOW_MS = 60_000;
const FREE_DAILY_LIMIT = 10;

type RateEntry = { count: number; resetAt: number };
const rateStore = new Map<string, RateEntry>();
const dailyStore = new Map<string, { date: string; count: number }>();

function getClientIp(req: any): string {
  const forwarded = typeof req?.headers?.['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : '';
  return forwarded.split(',')[0].trim() || req?.socket?.remoteAddress || 'unknown';
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateStore.get(key);
  if (!current || current.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return true;
  current.count += 1;
  return false;
}

function consumeFreeDaily(key: string): { allowed: boolean; remaining: number } {
  const date = new Date().toISOString().slice(0, 10);
  const current = dailyStore.get(key);
  if (!current || current.date !== date) {
    dailyStore.set(key, { date, count: 1 });
    return { allowed: true, remaining: FREE_DAILY_LIMIT - 1 };
  }
  if (current.count >= FREE_DAILY_LIMIT) return { allowed: false, remaining: 0 };
  current.count += 1;
  return { allowed: true, remaining: FREE_DAILY_LIMIT - current.count };
}

function send(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed' });
  }

  const contentLength = Number(req.headers?.['content-length'] || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_LENGTH) {
    return send(res, 413, { error: 'AI request is too large' });
  }

  const ip = getClientIp(req);
  let userId: string | null = null;
  let isPro = false;

  const authHeader = typeof req.headers?.authorization === 'string' ? req.headers.authorization : '';
  if (authHeader) {
    try {
      const user = await requireUser(new Request('https://local.invalid/api/ai', { headers: { authorization: authHeader } }));
      userId = user.id;
      const entitlements = await getEntitlements(user.id);
      isPro = entitlements.some(isEntitlementActive);
    } catch {
      return send(res, 401, { error: 'Invalid or expired authentication session.' });
    }
  }

  const rateKey = userId ? `user:${userId}` : `ip:${ip}`;
  if (rateLimited(rateKey)) {
    return send(res, 429, { error: 'Too many AI requests. Please wait before trying again.' });
  }

  if (!isPro) {
    const daily = consumeFreeDaily(rateKey);
    if (!daily.allowed) {
      return send(res, 429, {
        error: `Free AI limit reached (${FREE_DAILY_LIMIT} runs today). Sign in and upgrade to Pro for higher AI access.`,
        remaining: 0,
        pro: false,
      });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 503, { error: 'AI service is not configured on the server.' });

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'Invalid request body' });

  const code = typeof body.code === 'string' ? body.code : '';
  const instruction = typeof body.instruction === 'string' ? body.instruction : '';
  const customPrompt = typeof body.customPrompt === 'string' ? body.customPrompt : '';

  if (!code.trim()) return send(res, 400, { error: 'Code input is required' });
  if (code.length > MAX_CODE_LENGTH) return send(res, 413, { error: 'Code input exceeds the 20,000 character limit' });
  if (instruction.length > MAX_INSTRUCTION_LENGTH || customPrompt.length > MAX_INSTRUCTION_LENGTH) {
    return send(res, 413, { error: 'Instruction input is too large' });
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
    if (!text) return send(res, 502, { error: 'AI provider returned no text response' });
    return send(res, 200, { text, pro: isPro });
  } catch {
    return send(res, 502, { error: 'AI provider request failed' });
  }
}
