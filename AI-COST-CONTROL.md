# AI Cost Control — Current State

## Current server path
User browser → `/api/ai` → input limits → process-local IP rate limit → Gemini → bounded output → response.

## Current controls
- No browser-side Gemini API key.
- 20,000-character code limit.
- 4,000-character instruction limits.
- 1,400 maximum output tokens.
- 10 requests/minute/IP best-effort warm-instance limit.

## Missing controls
- Authentication.
- Free/Pro/Team durable quotas.
- Per-user usage ledger.
- Token/cost recording.
- Daily/monthly allowance enforcement.
- Abuse detection across instances/accounts.
- Billing-linked entitlement checks.

These missing controls remain NOT_RUN/NOT_IMPLEMENTED and must not be represented as production-grade quota protection.