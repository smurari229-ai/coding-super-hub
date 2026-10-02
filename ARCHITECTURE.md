# Coding Super Hub — Architecture

## Current architecture (2026-09-26)
- Frontend: React 19 + Vite + TypeScript.
- Styling: Tailwind CSS v4 via Vite plugin.
- Tool catalog: a static TypeScript catalog with 535 registered tools.
- Rendering: dedicated React renderers for high-value tools plus `GenericToolRunner` for the generic catalog path.
- Client persistence: browser `localStorage` for favorites and recent tools.
- AI boundary: Vercel serverless function at `/api/ai` using the server-only `GEMINI_API_KEY` environment variable.
- Identity: Supabase Auth email OTP; the browser stores only the signed session tokens needed to authenticate requests, while the server verifies the user through Supabase Auth.
- Billing: existing `public.pro_entitlements` is the server authorization source of truth; `public.billing_webhook_events` provides durable webhook idempotency.
- AI quota: existing Supabase project now has `public.ai_usage_daily` with atomic reserve/release RPCs; it is separate from billing and never client-authoritative.
- Deployment: Vercel.

## Current request flow
Tool input → client-side validation/processing → rendered result → copy/download/reset where implemented.

AI request → authenticated Supabase user → `/api/ai` → method/body/input limits + IP rate limit → durable entitlement lookup → atomic Free quota reservation when needed → Gemini → bounded response → client.

## Explicitly not implemented yet
- Database-backed workspace.
- Cross-device favorites/history.
- Token/cost ledger beyond quota counters.
- Team/advanced entitlement tiers.
- Project generator.
- GitHub repository write integration.
- Durable analytics pipeline.

These are roadmap gaps, not reasons to alter the existing tool engine without evidence.