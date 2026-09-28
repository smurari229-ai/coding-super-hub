# Coding Super Hub — Monetization

## Current state
- The repository contains UI components for Pro upgrade, sponsors, affiliates, ads, and transparency.
- Server-side Stripe Checkout Session and Lemon Squeezy order verification endpoints are implemented and validate configured paid Pro products.
- The Lemon Squeezy webhook endpoint verifies signed webhook payloads and validates the configured store/variants, but it does not persist entitlements or provide idempotent durable event processing.
- No database-backed subscription/entitlement store or authenticated user identity is currently implemented.

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

Live billing is therefore NOT_READY at this audit stage.