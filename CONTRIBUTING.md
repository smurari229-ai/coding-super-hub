# Contributing to Coding Super Hub

## Development setup

1. Install Node.js 20 LTS and Bun 1.4.0 or the compatible Bun release recorded by the lockfile.
2. Clone the repository and switch to a working branch.
3. Run `bun install --frozen-lockfile`.
4. Run `bun run lint`, `bun run test`, and `bun run build`.

## Branch naming

Use focused names such as `fix/<short-description>`, `feat/<short-description>`, `docs/<short-description>`, `test/<short-description>`, and `chore/<short-description>`.
Do not commit directly to `main`.

## Commit style

Use concise conventional-style messages such as `feat:`, `fix:`, `docs:`, `test:`, `chore:`, and `security:`.
Keep commits small and explain the reason for the change.

## Pull requests

- Describe the problem, change, and verification evidence.
- Preserve the 535-entry catalog unless a maintainer explicitly approves a catalog change.
- Do not weaken authentication, authorization, quota, billing, sandbox, or security-header controls.
- Do not commit secrets or real payment credentials.
- Include test and build results.
- Keep unrelated formatting or refactors out of focused fixes.

## Reporting security issues

Do not disclose sensitive vulnerabilities in public issues. Follow [SECURITY.md](SECURITY.md).