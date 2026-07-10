-- =============================================================
-- CMN — Database Trigger: Sync auth_providers from auth.identities
-- Run this in the Supabase SQL Editor
-- =============================================================

-- 1. Create or replace the function to sync auth_providers
create or replace function public.sync_auth_providers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider varchar(20);
begin
  -- Map Supabase provider names to our schema constraints ('email', 'google', 'apple', 'line')
  v_provider := case 
    when new.provider = 'email' then 'email'::varchar
    when new.provider = 'google' then 'google'::varchar
    when new.provider = 'line' then 'line'::varchar
    when new.provider = 'apple' then 'apple'::varchar
    else new.provider::varchar
  end;

  -- Ensure we only sync supported providers to avoid constraint violations
  if v_provider in ('email', 'google', 'apple', 'line') then
    insert into public.auth_providers (user_id, provider, provider_uid)
    values (
      new.user_id,
      v_provider,
      new.id
    )
    on conflict (provider, provider_uid) do update
    set user_id = excluded.user_id;
  end if;

  return new;
end;
$$;

-- 2. Create the trigger on auth.identities table
drop trigger if exists on_identity_added on auth.identities;
create trigger on_identity_added
  after insert or update on auth.identities
  for each row execute procedure public.sync_auth_providers();

-- 3. Backfill existing identities into public.auth_providers
insert into public.auth_providers (user_id, provider, provider_uid)
select 
  user_id,
  case 
    when provider = 'email' then 'email'::varchar
    when provider = 'google' then 'google'::varchar
    when provider = 'line' then 'line'::varchar
    when provider = 'apple' then 'apple'::varchar
    else provider::varchar
  end as provider,
  id as provider_uid
from auth.identities
where provider in ('email', 'google', 'apple', 'line')
on conflict (provider, provider_uid) do nothing;
