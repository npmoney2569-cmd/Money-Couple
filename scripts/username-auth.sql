-- Add username support for register/login
alter table public.users
  add column if not exists username varchar(30);

-- Backfill from auth metadata when available
update public.users u
set username = lower(trim(au.raw_user_meta_data->>'username'))
from auth.users au
where au.id = u.id
  and coalesce(u.username, '') = ''
  and coalesce(au.raw_user_meta_data->>'username', '') <> '';

-- Fallback backfill from email local-part if still empty
update public.users
set username = split_part(lower(email), '@', 1)
where coalesce(username, '') = ''
  and coalesce(email, '') <> '';

create unique index if not exists users_username_unique_idx
  on public.users (lower(username))
  where username is not null and username <> '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email, display_name, avatar_url, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    nullif(lower(trim(new.raw_user_meta_data->>'username')), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        username = coalesce(excluded.username, public.users.username),
        updated_at = now();

  return new;
end;
$$;

create or replace function public.resolve_login_email(login_input text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_input text;
begin
  v_input := lower(trim(login_input));

  select u.email
  into v_email
  from public.users u
  where u.deleted_at is null
    and (
      lower(coalesce(u.email, '')) = v_input
      or lower(coalesce(u.username, '')) = v_input
    )
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
