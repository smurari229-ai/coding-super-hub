# Coding Super Hub — Security

## Current verified controls
- `.env*` is ignored by Git except `.env.example`.
- Gemini calls are routed through `/api/ai`; the browser no longer constructs `GoogleGenAI` with a secret.
- `/api/ai` accepts POST only.
- Code input is capped at 20,000 characters.
- Instruction fields are capped at 4,000 characters.
- Request body is checked against a 26,000-byte content-length threshold when provided.
- AI output is capped with `maxOutputTokens: 1400`.
- The AI endpoint applies a best-effort 10 requests/minute/IP in-memory limit per warm function instance.
- Provider/server errors are not returned with stack traces or secrets.
- Production security headers are configured in `vercel.json` for CSP, MIME sniffing protection, referrer policy, permissions policy, and frame denial.
- Existing HSTS was observed on the production response.

## Important limitations
- The current rate limiter is process-local and is not a durable multi-instance quota system.
- Authentication, authorization, per-user quotas, usage accounting, and billing entitlements are not implemented yet.
- Full dependency vulnerability scanning is NOT_RUN.
- Browser XSS/injection regression testing is NOT_RUN.
- Mobile/security runtime testing is NOT_RUN.

## Unsafe execution policy
Do not execute arbitrary user-supplied code in the normal server process. Any future code-execution feature must use an isolated sandbox architecture before implementation.