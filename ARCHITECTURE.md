# Coding Super Hub — Architecture

## Current architecture (2026-09-26)
- Frontend: React 19 + Vite + TypeScript.
- Styling: Tailwind CSS v4 via Vite plugin.
- Tool catalog: a static TypeScript catalog with 535 registered tools.
- Rendering: dedicated React renderers for high-value tools plus `GenericToolRunner` for the generic catalog path.
- Client persistence: browser `localStorage` for favorites and recent tools.
- AI boundary: Vercel serverless function at `/api/ai` using the server-only `GEMINI_API_KEY` environment variable.
- Deployment: Vercel.

## Current request flow
Tool input → client-side validation/processing → rendered result → copy/download/reset where implemented.

AI request → `/api/ai` → method/body/input limits → in-memory rate limit → server-side Gemini call → bounded response → client.

## Explicitly not implemented yet
- User authentication and cloud identity.
- Database-backed workspace.
- Cross-device favorites/history.
- Durable AI quota and usage ledger.
- Subscription entitlement enforcement.
- Payment webhooks.
- Project generator.
- GitHub repository write integration.
- Durable analytics pipeline.

These are roadmap gaps, not reasons to alter the existing tool engine without evidence.