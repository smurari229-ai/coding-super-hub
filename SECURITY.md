# Coding Super Hub — Security

## Current verified controls
- `.env*` is ignored by Git except `.env.example`.
- Gemini calls are routed through `/api/ai`; the browser does not construct `GoogleGenAI` with a server secret.
- `/api/ai` accepts POST only and requires a verified Supabase Auth bearer token.
- AI code input is capped at 20,000 characters; instruction fields are capped at 4,000 characters; the request body is bounded.
- AI output is bounded and provider/server errors are returned without stack traces or secrets.
- The AI endpoint applies a best-effort process-local request rate limit; this is separate from the durable per-user daily quota.
- Free AI usage is server-authoritative and uses atomic Postgres reservation/release RPCs.
- Pro entitlement is stored durably in `public.pro_entitlements`; browser localStorage is only a persistence/UI hint and is not authorization.
- Stripe and Lemon Squeezy webhook handlers require signed requests and persist durable idempotency/retry state in `public.billing_webhook_events`.
- Payment verification endpoints require an authenticated user and validate provider-side payment/order/session state before persisting entitlement.
- Production security headers are configured in `vercel.json` for CSP, HSTS, MIME sniffing protection, referrer policy, permissions policy, and frame denial.

## Important limitations / release-gate evidence
- Real authenticated provider smoke tests have not yet been completed because the connected Supabase project currently has 0 Auth users and 0 durable billing/quota rows.
- Full semantic verification of all 535 catalog tools is not complete; the catalog smoke oracle is not a semantic correctness certificate.
- Browser/mobile runtime verification for 375px, 390px, and 412px has not yet been completed through this audit.
- The latest audit branch CI result is not currently verified for the current HEAD; a prior audit SHA had green CI.
- Vercel runtime evidence currently includes historical errors on payment-verification and Lemon webhook routes; these must be resolved/reverified before release.
- Production has not been promoted to the audit branch and remains a separate deployment/evidence surface.

## Authorization boundary
Client-local state must never be used as the source of truth for AI access, paid features, billing entitlement, or quota enforcement. Sensitive server operations must derive identity from the verified Supabase Auth token and re-check durable server-side state.

## Unsafe execution policy
Do not execute arbitrary user-supplied code in the normal server process. Any future code-execution feature must use an isolated sandbox architecture before implementation.
