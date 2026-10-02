# Coding Super Hub — Monetization

## Current state
- The repository contains UI components for Pro upgrade, sponsors, affiliates, ads, and transparency.
- Server-side Stripe Checkout Session and Lemon Squeezy order verification endpoints validate configured paid Pro products and bind the verified purchase to the authenticated account email.
- `public.pro_entitlements` is the durable Pro authorization source of truth.
- Lemon Squeezy and Stripe webhooks verify signatures and use `public.billing_webhook_events` for durable idempotency/retry handling.
- Supabase Auth email OTP provides the trusted user identity used by AI and payment verification.

## Planned model
- Free: core developer tools.
- Pro: higher AI allowance, cloud workspace, advanced generators, saved projects and premium capabilities.
- Pro+: expanded AI and advanced workflows.
- Team: shared usage/administration capabilities.

## Safety requirements before live billing
- Select and review the payment provider.
- Verify server-side payment signatures.
- Verify webhooks.
- Store plan state server-side.
- Derive entitlements server-side.
- Test renewal, cancellation, failure, upgrade and downgrade flows.
- Do not trust browser-only payment state.

Live billing code is implemented on the audit branch, but real provider configuration and end-to-end payment/webhook smoke tests remain required before production promotion.