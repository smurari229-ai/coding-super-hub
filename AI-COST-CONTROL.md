# AI Cost Control — Current State

## Current server path
User browser → `/api/ai` → input limits → process-local IP rate limit → Gemini → bounded output → response.

## Current controls
- No browser-side Gemini API key.
- Verified Supabase Auth identity required for /api/ai.
- 20,000-character code limit.
- 4,000-character instruction limits.
- 1,400 maximum output tokens.
- 10 requests/minute/IP best-effort warm-instance limit.
- Free quota is server-authoritative: 10 successful calls/day/user.
- Atomic Postgres reservation prevents concurrent overrun; failed Gemini calls release the reservation.
- Durable Pro entitlement is read from public.pro_entitlements.

## Still not implemented
- Token/cost recording beyond provider/model limits.
- Advanced abuse detection across accounts/instances.

These missing controls remain NOT_RUN/NOT_IMPLEMENTED and must not be represented as production-grade quota protection.