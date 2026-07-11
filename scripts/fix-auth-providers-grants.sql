-- Fix: Grant service_role access to auth_providers
-- Required for LINE OAuth callback (createAdminClient uses service_role key)
-- Run in Supabase SQL Editor

grant select, insert, update, delete on public.auth_providers to service_role;
grant select, insert, update, delete on public.auth_providers to authenticated;
grant usage on schema public to service_role;
