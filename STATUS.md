# Coding Super Hub — Release Audit Status

## Current source of truth

- Repository: `smurari229-ai/coding-super-hub`
- Stack: React 19 + TypeScript + Vite 8
- Audit branch: `phase1-a-to-z-release-audit-2026-09-28`
- Latest verified application/test HEAD: `52d3028a3d1f85aa64c0b4cd1a7b7cf7b7d0be8e`
- Main SHA: `89b26c6bf3c55d689d54bdb22f768bf00c3e1693`
- Merge base: `a33af47ab4c451fe44bf9680fa17ecee3fb2f390`
- Current compare: **379 commits ahead / 44 behind main** (diverged)
- PR #4: **OPEN / UNMERGED / mergeable=false**
- Latest CI: [run 37853393005](https://github.com/smurari229-ai/coding-super-hub/actions/runs/37853393005) on HEAD `52d3028` — **5/5 jobs PASS**, **11 test files / 87 tests PASS**.
- Latest preview deployment: [READY](https://vercel.com/earnal-hub/coding-super-hub/EjbwCjCWVJZcE3Q5F5fDcFFgCM5P), commit `210d657`.
- Latest preview HTTP smoke: **200 OK**, expected `Coding Super Hub — 535 Developer Tools & AI Coding Assistant` HTML and security headers observed.
- Public production `https://coding-super-hub.vercel.app`: HTTP 200, but it still serves **Coding Super Hub Explorer**, not the 535-tools app. Production has not been promoted by this audit.

## Safeguards

- Main was not changed.
- PR #4 was not merged.
- No rebase, force-push, history rewrite, or branch deletion was performed.
- The catalog count remains exactly 535; no tool entries were added or removed.
- These CI and preview results do not establish production readiness or live payment success.

## Catalog execution smoke oracle

Latest CI output from `tests/catalog-execution.test.ts`:

| Classification | Count |
|---|---:|
| Non-empty engine output observed | 316 |
| Explicit Coming-soon | 214 |
| Dedicated-UI entries needing UI-level smoke | 5 |
| Validation/input mismatches | 0 |
| Unexpected errors | 0 |
| Unclassified outcomes | 0 |
| **Total** | **535** |

Identity assertions pass: 535 entries, 535 unique IDs, 535 unique names. This is a deterministic smoke classification, **not semantic correctness PASS**. The 214 Coming-soon entries remain unsupported by the generic engine; the 316 outputs still need representative correctness assertions by tool family, and the five dedicated-UI entries need actual UI interaction testing.

## Changes made in this audit pass

- Fixed Lorem Ipsum generator routing so its requested word count reaches the dedicated handler.
- Improved representative catalog smoke inputs for Punycode, OAuth URL, PIN, base conversion, random range, HEX-to-RGB, currency/compact formatting, and string joining.
- Added an explicit assertion that the 535-tool smoke oracle has no unclassified outcomes.
- Hardened webhook status persistence: processing now throws if Supabase reports a failed status write or updates zero rows; added regression tests for these cases.
- Hardened both Stripe and Lemon webhook catch paths so a failure to persist the failed-event status still returns a retryable HTTP 500; regression tests are being run on the latest code.
- Latest CI run validates these changes on the audit branch only.

## Supabase / billing

Live project checked read-only: `psujvwayiqnzkhbhatks` (`ap-south-1`, healthy).

- Tables `public.pro_entitlements`, `public.billing_webhook_events`, and `public.ai_usage_daily` exist.
- RLS and FORCE RLS are enabled on all three.
- Entitlement owner-read policy exists; webhook events and AI usage are server-only by policy.
- Unique constraints/indexes include webhook `(provider,event_id)` and entitlement `(user_id,provider)` plus provider identifiers.
- Security advisor: 0 findings; performance advisor: 0 findings.
- Atomic `reserve_ai_quota` / `release_ai_quota` functions exist with `SECURITY INVOKER`, empty search path, and service-role-only execute grants.
- Current Auth user count: **0**. Real authenticated AI/Pro/payment end-to-end smoke is therefore **NOT_RUN/BLOCKED**.

### Migration reproducibility blocker

The live database migration history contains versions/names not represented by matching canonical migration files in the repository (including `harden_billing_rls`, `remove_unused_entitlement_index`, and `tighten_ai_usage_rls_cleanup_duplicate_indexes`). The checked-in migration filenames use date-only prefixes, while the live history uses timestamp versions. Do **not** run or invent schema migrations blindly; reconcile the exact applied SQL/history and commit a reproducible migration chain before claiming a clean-project bootstrap.

## Vercel environment configuration

Read-only inventory of the Vercel project environment variables found only the branch-specific public browser variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the audit preview. No server-side `GEMINI_API_KEY`, `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets/price IDs, or Lemon Squeezy API/webhook secrets/store/variant IDs were present in the returned project environment inventory. Secret values were not requested or exposed.

This means real AI and billing flows cannot be declared configured from current evidence. Add the actual credentials/IDs in Vercel's encrypted environment settings; do not commit them or fabricate values.

## Security and integration verification still pending

- Real authenticated Free/Pro AI request, 10th/11th daily quota boundary, failed-Gemini quota release.
- Live Stripe and Lemon Squeezy signed webhook delivery, cancellation, expiry, refund, duplicate/replay, and database-write failure behavior.
- Confirm Vercel environment-variable presence/configuration without exposing secret values.
- Browser-level smoke for tool execution, `?tool=` deep links, Markdown rendering, CodePlayground sandbox behavior under CSP, checkout flow, and error states.
- Mobile widths 375 / 390 / 412 and accessibility/keyboard/screen-reader checks.
- Semantic correctness tests across the 316 engine-output entries; dedicated UI behavior for five entries.
- Safe review of the 44 main-only commits and the divergent PR before any merge decision.

## Release gate

**NO-GO / BLOCKED.** The preview builds and serves the app, and CI passes, but the production URL still serves the Explorer app; real Auth/payment checks, migration reproducibility, browser/mobile/accessibility evidence, and catalog semantic verification remain incomplete.

Do not merge PR #4 or change Main as part of this audit.
