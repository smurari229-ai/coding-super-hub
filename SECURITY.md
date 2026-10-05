# Security Policy

## Reporting a vulnerability

Please do not disclose exploitable vulnerabilities publicly before maintainers have had an opportunity to investigate.

Use GitHub's private security reporting feature for this repository when available. If private reporting is unavailable, contact the repository maintainer through a private channel listed on the repository profile.

Include:
- affected file/route and version or commit;
- concise reproduction steps;
- impact;
- suggested mitigation, if known.

Do not include real API keys, payment credentials, access tokens, customer data, or other secrets in a report.

## Scope

Security-sensitive areas include:
- server API routes and authentication;
- Supabase RLS and service credentials;
- Stripe/Lemon Squeezy verification and webhooks;
- AI provider integration;
- sandboxed iframe execution;
- CSP and other response headers;
- XSS, injection, and unsafe URL handling.

## Supported versions

The default branch and the current release/audit branch are the supported development targets. Security fixes should be backported only when the maintainer explicitly decides to support an older release.

## Secret handling

Browser-exposed `VITE_*` values must contain only public configuration. Server-only credentials such as payment secrets, webhook secrets, Supabase secret keys, and Gemini API keys must never be prefixed with `VITE_`.
