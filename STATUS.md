# Coding Super Hub — Release Audit Status

## Current source of truth

- Repository: `smurari229-ai/coding-super-hub`
- Stack: React 19 + TypeScript + Vite 8
- Audit branch: `phase1-a-to-z-release-audit-2026-09-28`
- Latest audit branch head at this recheck: `3f7b20380862b1401efb2ace2958e012872fbd63` (mobile overflow and icon-button accessibility fixes).
- Main SHA: `89b26c6bf3c55d689d54bdb22f768bf00c3e1693`
- Merge base: `a33af47ab4c451fe44bf9680fa17ecee3fb2f390`
- Current compare: **513 commits ahead / 44 commits behind main; diverged**. PR #4 is `mergeable=false`; GitHub currently reports 80 changed files, 9,663 additions and 686 deletions.
- PR #4: **OPEN / UNMERGED / mergeable=false**
- Latest prior GitHub Actions CI: [run 37887618100](https://github.com/smurari229-ai/coding-super-hub/actions/runs/37887618100) — **5/5 jobs PASS**, previously 12 test files / 121 tests. Independently re-ran on `3bed3bb3ac4e5569bad562bec018f69bf28843af` in a clean Vercel sandbox: frozen install PASS, TypeScript lint PASS, **12 test files / 124 tests PASS**, production build PASS. Build emits a >500 kB JS chunk warning and Vite config-loader warning.
- Vercel preview deployment for current audit head `3f7b20380862b1401efb2ace2958e012872fbd63` is reported READY. Using a temporary protected-preview access link, checked app HTML title, JS asset HTTP 200, CSS asset HTTP 200, CSP, HSTS, Permissions-Policy, Referrer-Policy and X-Content-Type-Options. Temporary share access was used only for smoke verification. No production promotion was attempted.
- Latest protected-preview browser smoke: app HTML and primary JS/CSS assets returned 200; widths 375/390/412 and 1280 have no horizontal overflow; no CSP violations or page errors were observed; `?tool=json-formatter` loaded; JSON formatter action worked; Pro modal opened; search dialog worked for UUID query. Initial page and open search dialog had 0 unnamed buttons after adding accessible names to icon-only actions. This is targeted smoke, not a full WCAG/screen-reader audit.
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

Identity assertions pass: 535 entries, 535 unique IDs, 535 unique names. This is a deterministic smoke classification, **not semantic correctness PASS**. The 157 Coming-soon entries remain unsupported by the generic engine; the 366 outputs still need representative correctness assertions by tool family. All 48 dedicated components need UI interaction tests; 12 currently return generic engine fallback.

## Latest recheck — 2026-10-10\n\n- Added release tag validation and removed direct shell interpolation of the release tag in `.github/workflows/release.yml`; commit `3bed3bb3ac4e5569bad562bec018f69bf28843af`. File was re-fetched and verified. Added the exact Lemon Squeezy script host to `script-src` and a regression test; fixed mobile navbar overflow and accessible names for icon-only buttons.\n- Clean sandbox checks on latest application/security code: `bun install --frozen-lockfile`, `bun run lint`, `bun run test` (**12 files / 124 tests**), and `bun run build` all exited 0.\n- Current preview serves title `Coding Super Hub — 535 Developer Tools & AI Coding Assistant`; primary JS/CSS assets returned HTTP 200 and expected preview security headers were present. Browser smoke exposed a real CSP issue: Lemon Squeezy's observed `https://assets.lemonsqueezy.com/lemon.js` script was blocked by `script-src`. Fixed by allowing that exact host in `vercel.json` and adding a scoped regression assertion in `tests/security-headers.test.ts`. The first new test correctly failed because its wildcard assertion accidentally inspected `frame-src`; it was narrowed to the `script-src` directive, then all 124 tests passed.\n- Production smoke still returns title `Coding Super Hub Explorer`; observed production headers include HSTS but did not include CSP, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy in the response checked. Production is the `main` app and was deliberately not changed.\n- Vercel environment inventory shows only two Preview variables for the audit branch and `hiddenProductionEnvCount: 0`; no server-side AI/payment credential presence was established. Do not run live checkout or claim live AI/payment readiness.\n- Release remains **NO-GO / BLOCKED** because the 535-tool audit app and Explorer production app have different roots; main has 44 commits absent from audit, PR is 508 ahead/44 behind and `mergeable=false`. Do not merge, rebase, force-push, or promote production until app-root and main-only monetization changes are reconciled.\n\n## Changes made in this audit pass

- Fixed Lorem Ipsum generator routing so its requested word count reaches the dedicated handler.
- Improved representative catalog smoke inputs for Punycode, OAuth URL, PIN, base conversion, random range, HEX-to-RGB, currency/compact formatting, and string joining.
- Added an explicit assertion that the 535-tool smoke oracle has no unclassified outcomes.
- Hardened webhook status persistence: processing now throws if Supabase reports a failed status write or updates zero rows; added regression tests for these cases.
- Hardened both Stripe and Lemon webhook catch paths so a failure to persist the failed-event status still returns a retryable HTTP 500.
- Fixed HTML entity decoding to handle case-insensitive named entities and preserve invalid Unicode numeric entities rather than throwing.
- Fixed monthly Pro entitlement boundaries across Stripe and Lemon verification/webhook paths: monthly entitlements require a valid provider period end; Lemon monthly order events alone no longer grant unbounded Pro.
- Implemented 33 additional deterministic utility handlers (array flatten/chunk/group/set operations, random array pick, ISO currency/country lookup, JSON-to-Go, cron, mock API response, sorting trace, and binary-search trace) with representative catalog inputs and focused regression tests. Latest completed GitHub CI on the earlier feature/test head: **5/5 jobs PASS, 12 test files / 121 tests PASS**. A fresh local sandbox run on current head passes 12 files / 123 tests; catalog smoke observes 366 outputs, 157 explicit Coming-soon, 0 input mismatches, 0 unexpected errors, and 0 unclassified outcomes.
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
