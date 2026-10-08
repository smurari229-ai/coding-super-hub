-- Reproducible baseline for the billing tables observed in the live project.
-- Idempotent: safe to apply when these tables already exist.
create table if not exists public.pro_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'lemon-squeezy', 'manual')),
  plan text not null check (plan in ('monthly', 'lifetime')),
  status text not null check (status in ('active', 'cancelled', 'expired', 'refunded')),
  expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  lemon_order_id text,
  lemon_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create unique index if not exists pro_entitlements_stripe_subscription_uidx
  on public.pro_entitlements (stripe_subscription_id) where stripe_subscription_id is not null;
create unique index if not exists pro_entitlements_stripe_session_uidx
  on public.pro_entitlements (stripe_session_id) where stripe_session_id is not null;
create unique index if not exists pro_entitlements_stripe_payment_intent_uidx
  on public.pro_entitlements (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create unique index if not exists pro_entitlements_lemon_order_uidx
  on public.pro_entitlements (lemon_order_id) where lemon_order_id is not null;
create unique index if not exists pro_entitlements_lemon_subscription_uidx
  on public.pro_entitlements (lemon_subscription_id) where lemon_subscription_id is not null;

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe', 'lemon-squeezy')),
  event_id text not null,
  status text not null check (status in ('processing', 'processed', 'failed')),
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

-- These indexes are included in the live schema and protect durable event
-- idempotency and one-provider-row-per-entitlement semantics.
create unique index if not exists billing_webhook_events_provider_event_id_key
  on public.billing_webhook_events (provider, event_id);
