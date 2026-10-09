# Coding Super Hub — Release Audit Status

## Current source of truth

- Repository: `smurari229-ai/coding-super-hub`
- Stack: React 19 + TypeScript + Vite 8
- Audit branch: `phase1-a-to-z-release-audit-2026-09-28`
- Latest application/tool-engine code and passing test head: `ac6fcc1b3c91e0e2abc860e9430ab4a7e7f0d5b1`.
- Main SHA: `89b26c6bf3c55d689d54bdb22f768bf00c3e1693`
- Merge base: `a33af47ab4c451fe44bf9680fa17ecee3fb2f390`
- Current compare: **485 commits ahead / 44 commits behind main; diverged** (GitHub PR reports 484 commits in the PR range; compare and PR commit metrics use different ranges). PR #4 is `mergeable=false` with 79 changed files, approximately 9,420 additions and 681 deletions.
- PR #4: **OPEN / UNMERGED / mergeable=false**
- Latest full CI: [run 37887618100](https://github.com/smurari229-ai/coding-super-hub/actions/runs/37887618100) — **5/5 jobs PASS**, **12 test files / 121 tests PASS**.
- Latest successful preview before the newest five-handler batch is [READY](https://vercel.com/earnal-hub/coding-super-hub/yeL41T233PYn5QFLb1wfr3ETFccd), commit `defef993a97b4b2011a36bebc4809ebbe5685610`; HTML/assets/manifest/deep-link/CSP smoke passed on that older code head. A fresh preview for fully CI-passing head `cd24e3a300e74f6c15a68561a9df9c832f9577b0` was blocked by Vercel's deployment API daily quota (402, retry after 24 hours). No production promotion was attempted.
- Last successful preview HTTP smoke: **200 OK**** for app HTML, JS, CSS, manifest, and `?tool=json-formatter` fallback; expected app title and security headers observed. This predates the newest five-handler batch.
- Public production `https://coding-super-hub.vercel.app`: HTTP 200, but it still serves **Coding Super Hub Explorer**, not the 535-tools app. Production has not been promoted by this audit.

## Main-vs-audit branch compatibility review

- Read the 44 commits reachable from `main` but not the audit branch. Their commit messages cover Pro entitlements, AI usage limits, affiliate configuration, Stripe/Lemon Squeezy verification and webhooks, and monetization UI; the compare shows 15 affected files in these overlapping areas.
- Confirmed `main`'s `index.html` title is **Coding Super Hub Explorer** and its `package.json` name is `react-example`; it has no `test` script. The audit branch's package is named `coding-super-hub`, declares 535 tools, and has Vitest coverage. This is a real app/root divergence, not merely a stale production alias.
- Therefore, blindly merging PR #4 or promoting the audit preview would risk replacing the current production app and losing/replacing main-only monetization work. No merge, rebase, or production promotion was attempted. A safe release needs an explicit integration plan to reconcile the two app roots and port/review the 44 main-only changes.

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
| Non-empty engine output observed | 366 |
| Explicit Coming-soon | 157 |
| Dedicated-UI entries returning generic fallback and needing UI-level smoke | 12 |
| Validation/input mismatches | 0 |
| Unexpected errors | 0 |
| Unclassified outcomes | 0 |
| **Total** | **535** |

Identity assertions pass: 535 entries, 535 unique IDs, 535 unique names. This is a deterministic smoke classification, **not semantic correctness PASS**. The 177 Coming-soon entries remain unsupported by the generic engine; the 346 outputs still need representative correctness assertions by tool family. All 48 dedicated components need UI interaction tests; 12 currently return generic engine fallback.

## Changes made in this audit pass

- Fixed Lorem Ipsum generator routing so its requested word count reaches the dedicated handler.
- Improved representative catalog smoke inputs for Punycode, OAuth URL, PIN, base conversion, random range, HEX-to-RGB, currency/compact formatting, and string joining.
- Added an explicit assertion that the 535-tool smoke oracle has no unclassified outcomes.
- Hardened webhook status persistence: processing now throws if Supabase reports a failed status write or updates zero rows; added regression tests for these cases.
- Hardened both Stripe and Lemon webhook catch paths so a failure to persist the failed-event status still returns a retryable HTTP 500.
- Fixed HTML entity decoding to handle case-insensitive named entities and preserve invalid Unicode numeric entities rather than throwing.
- Fixed monthly Pro entitlement boundaries across Stripe and Lemon verification/webhook paths: monthly entitlements require a valid provider period end; Lemon monthly order events alone no longer grant unbounded Pro.
- Implemented 33 additional deterministic utility handlers (array flatten/chunk/group/set operations, random array pick, ISO currency/country lookup, JSON-to-Go, cron, mock API response, sorting trace, and binary-search trace) with representative catalog inputs and focused regression tests. Latest completed CI on the feature/test head: **5/5 jobs PASS, 12 test files / 101 tests PASS**; catalog smoke now observes 346 outputs, 177 explicit Coming-soon, 0 input mismatches, 0 unexpected errors, and 0 unclassified outcomes.
- Latest CI run validates these changes on the audit branch only. Additional handlers cover regex escaping, passphrase generation, user-agent classification, exact age, bounded business-day counting, HTTP security-header inspection, SMS segment counting, safe SVG favicon output, HEX/RGB/HSL conversion, two's-complement conversion, fluid spacing CSS, FAQ/Organization/Article/Product/Breadcrumb JSON-LD, CSV-to-XML, IEEE 754 float inspection, bitwise inversion, geohash encoding/decoding, and GeoJSON structure validation. JSON-LD output escapes `<` to prevent script-element breakout; CSS property names and external URLs are validated. Latest passing catalog smoke observes 366 non-empty outputs and 157 explicit Coming-soon entries; this is still not a semantic correctness pass.

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

The live database migration history contains versions/names not represented by matching canonical migration files in the repository (including `harden_billing_rls`, `remove_unused_entitlement_index`, and `tighten_ai_usage_rls_cleanup_duplicate_indexes`). The previously missing timestamped migration files have been restored as idempotent equivalents based on live schema metadata, and a `20260929000000_billing_core_tables.sql` baseline now supports clean-project bootstrap. The baseline is not applied to the live project. These files are reconstructed equivalents, not a byte-for-byte recovery of the original dashboard-applied SQL; review the diff and validate a clean local Supabase bootstrap before applying any migrations to production.

## Vercel environment configuration

Read-only Vercel environment inventory returned only two audit-branch Preview variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the API response reported `hiddenProductionEnvCount: 0`. No server-side Gemini/Supabase service credentials or Stripe/Lemon Squeezy server credentials/price IDs were present in that inventory. Production environment readiness is NOT verified. Secret values were not requested or exposed.

This means real AI and billing flows cannot be declared configured from current evidence. Add the actual credentials/IDs in Vercel's encrypted environment settings; do not commit them or fabricate values.

## Security and integration verification still pending

- Real authenticated Free/Pro AI request, 10th/11th daily quota boundary, failed-Gemini quota release.
- Live Stripe and Lemon Squeezy signed webhook delivery, cancellation, expiry, refund, duplicate/replay, and database-write failure behavior.
- Confirm Vercel environment-variable presence/configuration without exposing secret values.
- Browser-level smoke for tool execution, `?tool=` deep links, Markdown rendering, CodePlayground sandbox behavior under CSP, checkout flow, and error states.
- Mobile widths 375 / 390 / 412 and accessibility/keyboard/screen-reader checks.
- Semantic correctness tests across the 346 engine-output entries; dedicated UI behavior for all 48 dedicated components, especially 12 with generic fallback.
- Verify a clean local Supabase bootstrap against the restored canonical migrations; no migration was executed on the live project during this pass.
- Safe review of the 44 main-only commits and the divergent PR before any merge decision.

## Release gate

**NO-GO / BLOCKED.** The preview builds and serves the app, and CI passes, but the production URL still serves the Explorer app; real Auth/payment checks, migration reproducibility, browser/mobile/accessibility evidence, and catalog semantic verification remain incomplete.

Do not merge PR #4 or change Main as part of this audit.
