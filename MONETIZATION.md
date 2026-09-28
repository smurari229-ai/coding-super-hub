# Coding Super Hub — Monetization

## Current state
- The repository contains UI components for Pro upgrade, sponsors, affiliates, ads, and transparency.
- No verified payment processor, subscription database, webhook verification, or server-side entitlement system is currently present in the inspected tree.

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