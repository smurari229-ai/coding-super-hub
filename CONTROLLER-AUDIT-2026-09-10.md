# Coding Super Hub — Controller Audit

Date: 2026-09-10
Base: main @ af18d29b85d0f6c7bfd07fb62429c2226f5f227c
Protected scope: Tests 1–150

## Rules
- Do not overwrite `index.html` blindly.
- Keep a backup before any production change.
- Prepare changes on a separate branch first.
- Review/validate before merge to `main`.
- Do not put GitHub tokens or provider secrets in frontend code.

## Findings
1. **Test 1 CSS seed bug — confirmed:** the default CSS textarea contains `<h1 {` instead of `h1 {`. This should be fixed in a reviewed change.
2. **AI key storage — security issue:** the Gemini API key is stored in browser `localStorage` and the browser calls the Gemini API directly. This is acceptable only as a prototype; production should use a server-side/Vercel endpoint with a secret environment variable.
3. **Test 1 preview isolation — improvement required:** user JavaScript is rendered through an iframe `srcdoc` without a sandbox attribute. This should be hardened before adding an AI/controller that can generate arbitrary code.
4. **Password generator — security improvement:** it uses `Math.random()`. A security-grade password generator should use `crypto.getRandomValues()`.
5. **UUID generator — security/quality improvement:** it uses `Math.random()` instead of `crypto.randomUUID()` where available.
6. **Test 126 naming/behavior — review required:** the current URL shortener behavior appears to generate a local identifier rather than a publicly resolvable short URL. Rename/clarify unless a backend service is added.
7. **Architecture risk:** the application is a large single `index.html`. Future refactoring should be incremental and must preserve Tests 1–150.

## Current safety state
- `main` has not been modified by this audit.
- Snapshot branch: `backup-before-controller-2026-09-10`
- Audit branch: `controller-audit-2026-09-10`

## Next safe implementation order
1. Add validation/smoke-test layer without changing Tests 1–150.
2. Fix only confirmed low-risk bugs on the audit branch.
3. Harden Test 1 iframe execution.
4. Move Gemini calls behind a server-side endpoint.
5. Build the approval-based AI Index Controller.
6. Merge only after review and validation.
