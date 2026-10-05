# Contributing to Coding Super Hub

Thanks for helping improve Coding Super Hub.

## Development

1. Use Node.js 20.19+.
2. Install dependencies with the repository's locked package manager:
   `bun install --frozen-lockfile`
3. Create a local `.env` from `.env.example`. Never commit real secrets.
4. Run `npm run dev` for local development.
5. Before opening a PR run:
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `npm run format:check`

## Safe-change rules

- Preserve the 535-entry catalog unless the change explicitly concerns catalog maintenance.
- Prefer the smallest evidence-based fix.
- Do not commit API keys, payment secrets, service-role keys, or customer data.
- Never treat browser storage as the authority for Pro entitlement.
- Keep the Code Playground sandboxed; do not add `allow-same-origin` to its sandbox.
- Do not claim a tool works unless its execution path has been tested.
- Add or update tests for behavior changes.
- Keep documentation honest about what is local-only and what is sent to third-party providers.

## Pull requests

Describe the problem, the smallest safe fix, test evidence, and any deployment/configuration requirement. Do not force-push or rewrite shared audit history without explicit maintainer approval.
