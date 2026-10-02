# Monetization Setup

This repository intentionally contains no real affiliate identifiers, payment handles, or checkout credentials.

## Checkout URLs

Set these Vercel environment variables for the production deployment:

- `VITE_LEMON_SQUEEZY_MONTHLY_URL`
- `VITE_LEMON_SQUEEZY_LIFETIME_URL`
- `VITE_STRIPE_MONTHLY_URL`
- `VITE_STRIPE_LIFETIME_URL`

Only public checkout URLs belong in `VITE_*` variables. Never put Stripe secret keys or Lemon Squeezy API keys in client variables.

## Sponsor links

Set:

- `VITE_BUYMEACOFFEE_URL`
- `VITE_GITHUB_SPONSORS_URL`
- `VITE_UPI_ID`

The application hides an unset sponsor method rather than displaying a fabricated handle.

## Affiliate links

`src/data/affiliates.ts` contains no hard-coded referral IDs. Affiliate URLs are read from environment variables for supported providers.

Unset affiliate variables fall back to the providers' public homepages and are not marked as affiliate links.

## Placeholder policy

If a maintainer needs to stage a value before configuring a real provider, use an explicit token such as `__REPLACE_ME__` or `__REPLACE_ME_STRIPE_URL__`. Never commit a real affiliate ID, payment handle, API key, or secret.

## Verification

Before enabling monetization, verify public checkout URLs, provider price or variant configuration, webhook secrets, authenticated identity mapping, refund handling, cancellation handling, and entitlement expiry.