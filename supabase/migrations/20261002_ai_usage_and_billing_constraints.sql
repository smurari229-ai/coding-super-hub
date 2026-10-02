create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  successful_calls integer not null default 0 check (successful_calls >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

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

create or replace function public.reserve_ai_quota(
  p_user_id uuid,
  p_usage_date date,
  p_limit integer
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  reserved_count integer;
begin
  if p_limit <= 0 then
    return false;
  end if;

  insert into public.ai_usage_daily (user_id, usage_date, successful_calls, updated_at)
  values (p_user_id, p_usage_date, 1, now())
  on conflict (user_id, usage_date)
  do update
    set successful_calls = public.ai_usage_daily.successful_calls + 1,
        updated_at = now()
    where public.ai_usage_daily.successful_calls < p_limit
  returning successful_calls into reserved_count;

  return reserved_count is not null;
end;
$$;

create or replace function public.release_ai_quota(
  p_user_id uuid,
  p_usage_date date
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  released boolean;
begin
  update public.ai_usage_daily
     set successful_calls = greatest(successful_calls - 1, 0),
         updated_at = now()
   where user_id = p_user_id
     and usage_date = p_usage_date
     and successful_calls > 0
  returning true into released;

  return coalesce(released, false);
end;
$$;

revoke all on function public.reserve_ai_quota(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_quota(uuid, date, integer) to service_role;

revoke all on function public.release_ai_quota(uuid, date) from public, anon, authenticated;
grant execute on function public.release_ai_quota(uuid, date) to service_role;
