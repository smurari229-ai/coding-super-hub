-- Drop the redundant user_id-only index; (user_id, provider) already
-- supports user_id prefix lookups and enforces the entitlement uniqueness rule.
drop index if exists public.pro_entitlements_user_id_idx;
