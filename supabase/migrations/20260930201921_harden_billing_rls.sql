-- Reconstructed, idempotent equivalent of the live harden_billing_rls migration.
alter table public.pro_entitlements enable row level security;
alter table public.pro_entitlements force row level security;
revoke all on table public.pro_entitlements from anon, authenticated;
grant select on table public.pro_entitlements to authenticated;
grant all on table public.pro_entitlements to service_role;

drop policy if exists "Users can read their own Pro entitlement" on public.pro_entitlements;
create policy "Users can read their own Pro entitlement"
  on public.pro_entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

alter table public.billing_webhook_events enable row level security;
alter table public.billing_webhook_events force row level security;
revoke all on table public.billing_webhook_events from anon, authenticated;
grant all on table public.billing_webhook_events to service_role;

drop policy if exists "Billing webhook events are server-only" on public.billing_webhook_events;
create policy "Billing webhook events are server-only"
  on public.billing_webhook_events
  for all
  to anon, authenticated
  using (false)
  with check (false);
