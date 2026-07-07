insert into public.accounts (user_id, name, type, balance, initial_balance, currency, is_active)
select u.id, 'บัญชีสำรอง', 'bank', 3000, 3000, 'THB', true
from public.users u
where u.email = 'admin@cmn.local'
  and not exists (
    select 1 from public.accounts a
    where a.user_id = u.id
      and a.name = 'บัญชีสำรอง'
  );
