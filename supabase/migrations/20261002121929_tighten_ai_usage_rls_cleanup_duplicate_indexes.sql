-- Reassert the restrictive server-only policy and clean the legacy
-- user_id-only index if it exists. This is idempotent for live databases.
alter table public.ai_usage_daily enable row level security;
alter table public.ai_usage_daily force row level security;
revoke all on table public.ai_usage_daily from anon, authenticated;
grant all on table public.ai_usage_daily to service_role;

drop policy if exists "AI usage is server-only" on public.ai_usage_daily;
create policy "AI usage is server-only"
  on public.ai_usage_daily
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop index if exists public.pro_entitlements_user_id_idx;
