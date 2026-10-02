# Contributing to Coding Super Hub

## Prerequisites

- Node.js 20 LTS or newer.
- Bun 1.4.0 or the compatible Bun release recorded by the lockfile.
- Git and a GitHub account.

## Setup

1. Clone the repository.
2. Create a focused working branch.
3. Run `bun install --frozen-lockfile`.
4. Run `bun run dev` to start the local development server.
5. Before opening a pull request, run `bun run lint`, `bun run test`, and `bun run build`.

## Branch naming

Use one of these prefixes:

- `feat/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `chore/<short-description>`

Do not commit directly to `main`.

## Commit style

Use Conventional Commits, for example:

- `feat: add a new developer tool`
- `fix: prevent invalid input from reaching the API`
- `docs: clarify local setup`
- `chore: update CI configuration`

Keep commits focused and explain the reason for the change.

## Pull requests

Every pull request should:

- Describe the problem, scope, and verification evidence.
- Pass `bun run lint`, `bun run test`, and `bun run build`.
- Preserve existing tool and UI behavior unless the PR explicitly changes it.
- Preserve authentication, authorization, quota, billing, sandbox, and security-header controls.
- Avoid committing secrets, payment credentials, API keys, or private environment values.
- Keep unrelated formatting and refactors out of focused fixes.
- Update documentation when public behavior or configuration changes.

## Adding a new tool

1. Review `src/data/tools-catalog.ts` for the existing catalog structure, IDs, categories, names, descriptions, and metadata.
2. Preserve unique tool IDs and names.
3. Prefer an existing engine handler when the tool semantics match an existing implementation.
4. If dedicated UI is genuinely required, keep the change isolated and add appropriate tests.
5. Verify the catalog count and relevant routing behavior before submitting the pull request.

## Code style

- Use strict TypeScript and preserve the repository's existing compiler configuration.
- Do not use `any`; prefer explicit types, unions, generics, or `unknown` with validation.
- Use Tailwind CSS for UI styling where UI changes are necessary.
- Keep deterministic transformations pure and testable where practical.
- Do not weaken security controls to simplify implementation.

## Security

Do not disclose sensitive vulnerabilities in public issues. Follow [SECURITY.md](SECURITY.md).
