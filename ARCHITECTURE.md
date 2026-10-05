# Architecture

Coding Super Hub is a React 19 + TypeScript + Vite 8 application.

## Runtime layers

- `src/data/tools-catalog.ts`: the 535-entry metadata catalog.
- `src/lib/tool-engine/`: deterministic tool execution handlers.
- `src/components/tools/`: dedicated React UIs for high-value tools.
- `src/lib/auth.ts`: browser session handling for Supabase Auth.
- `src/lib/pro.ts`: client display state only; server verification remains authoritative.
- `api/`: server-side AI and payment verification/webhook handlers.
- `supabase/migrations/`: database constraints and RLS-related schema changes.
- `public/`: static manifest, robots, and sitemap assets.

## Security boundaries

Gemini and payment-provider secrets stay server-side. The browser sends an authenticated Supabase access token to protected API routes. Pro entitlement is verified server-side and persisted in Supabase.

The Code Playground executes user-supplied HTML/CSS/JS inside a sandboxed iframe with `allow-scripts` only and no `allow-same-origin`.

## Release principle

A passing TypeScript check, test suite, and build are necessary but not sufficient for a release. Production smoke testing, payment-provider verification, Supabase configuration, accessibility, and mobile checks must also be verified before claiming release readiness.
