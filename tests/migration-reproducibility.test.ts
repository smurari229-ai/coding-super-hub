import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationDir = join(process.cwd(), 'supabase', 'migrations');
const migrations = readdirSync(migrationDir).filter(name => name.endsWith('.sql'));

const readMigration = (name: string) => readFileSync(join(migrationDir, name), 'utf8');

describe('Supabase migration reproducibility', () => {
  it('keeps checked-in migration versions aligned with the live migration history', () => {
    expect(migrations).toEqual([
      '20260929000000_billing_core_tables.sql',
      '20260930201921_harden_billing_rls.sql',
      '20260930201929_remove_unused_entitlement_index.sql',
      '20261002121910_ai_usage_and_billing_constraints.sql',
      '20261002121929_tighten_ai_usage_rls_cleanup_duplicate_indexes.sql',
      '20261002122251_remove_redundant_entitlement_index.sql',
    ]);
  });

  it('defines the billing tables and durable idempotency constraints for a clean bootstrap', () => {
    const baseline = readMigration('20260929000000_billing_core_tables.sql');
    expect(baseline).toContain('create table if not exists public.pro_entitlements');
    expect(baseline).toContain('unique (user_id, provider)');
    expect(baseline).toContain('create table if not exists public.billing_webhook_events');
    expect(baseline).toContain('unique (provider, event_id)');
    expect(baseline).toContain('pro_entitlements_stripe_session_uidx');
    expect(baseline).toContain('pro_entitlements_lemon_subscription_uidx');
  });

  it('enforces server-only billing and AI usage writes under RLS', () => {
    const billingRls = readMigration('20260930201921_harden_billing_rls.sql');
    const aiQuota = readMigration('20261002121910_ai_usage_and_billing_constraints.sql');
    const tightened = readMigration('20261002121929_tighten_ai_usage_rls_cleanup_duplicate_indexes.sql');
    expect(billingRls).toContain('force row level security');
    expect(billingRls).toContain('using (false)');
    expect(billingRls).toContain('grant all on table public.billing_webhook_events to service_role');
    expect(aiQuota).toContain('security invoker');
    expect(aiQuota).toContain("set search_path = ''");
    expect(aiQuota).toContain('grant execute on function public.reserve_ai_quota(uuid, date, integer) to service_role');
    expect(tightened).toContain('as restrictive');
    expect(tightened).toContain('with check (false)');
  });
});
