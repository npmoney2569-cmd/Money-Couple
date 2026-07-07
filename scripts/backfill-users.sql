insert into public.users (id, email, display_name, avatar_url)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'full_name', ''),
  au.raw_user_meta_data->>'avatar_url'
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;
