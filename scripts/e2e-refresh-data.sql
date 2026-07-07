do $$
declare
  v_user_id uuid;
  v_account_a uuid;
  v_account_b uuid;
  v_cat_income uuid;
  v_cat_expense uuid;
  v_tx_income uuid;
  v_tx_expense uuid;
  v_tx_transfer uuid;
begin
  select id into v_user_id from public.users where email = 'admin@cmn.local' limit 1;
  if v_user_id is null then
    raise exception 'admin user not found in public.users';
  end if;

  -- Cleanup old E2E data for this user
  delete from public.transaction_splits
  where transaction_id in (
    select id from public.transactions
    where user_id = v_user_id and coalesce(note, '') like 'E2E:%'
  );

  delete from public.transaction_tags
  where transaction_id in (
    select id from public.transactions
    where user_id = v_user_id and coalesce(note, '') like 'E2E:%'
  );

  delete from public.transactions
  where user_id = v_user_id and coalesce(note, '') like 'E2E:%';

  delete from public.accounts
  where user_id = v_user_id and name in ('E2E-บัญชีหลัก', 'E2E-บัญชีสำรอง');

  delete from public.categories
  where user_id = v_user_id and name in ('E2E-รายรับ', 'E2E-รายจ่าย');

  -- Categories
  insert into public.categories (user_id, name, type, color, is_preset, sort_order)
  values
    (v_user_id, 'E2E-รายรับ', 'income', '#34d399', false, 1)
  returning id into v_cat_income;

  insert into public.categories (user_id, name, type, color, is_preset, sort_order)
  values
    (v_user_id, 'E2E-รายจ่าย', 'expense', '#f87171', false, 1)
  returning id into v_cat_expense;

  -- Accounts
  insert into public.accounts (user_id, name, type, balance, initial_balance, currency, is_active)
  values (v_user_id, 'E2E-บัญชีหลัก', 'cash', 2000, 2000, 'THB', true)
  returning id into v_account_a;

  insert into public.accounts (user_id, name, type, balance, initial_balance, currency, is_active)
  values (v_user_id, 'E2E-บัญชีสำรอง', 'bank', 1000, 1000, 'THB', true)
  returning id into v_account_b;

  -- Transactions (balance trigger should apply)
  insert into public.transactions (user_id, type, amount, date, account_id, category_id, payee, note, source)
  values (v_user_id, 'income', 5000, current_date, v_account_a, v_cat_income, 'E2E รายรับ', 'E2E: income', 'app')
  returning id into v_tx_income;

  insert into public.transactions (user_id, type, amount, date, account_id, category_id, merchant, note, source)
  values (v_user_id, 'expense', 1200, current_date, v_account_a, v_cat_expense, 'E2E ร้านอาหาร', 'E2E: expense', 'app')
  returning id into v_tx_expense;

  insert into public.transactions (user_id, type, amount, date, account_id, to_account_id, fee_amount, note, source)
  values (v_user_id, 'transfer', 500, current_date, v_account_a, v_account_b, 10, 'E2E: transfer', 'app')
  returning id into v_tx_transfer;

  -- One split row for update/delete testing
  insert into public.transaction_splits (transaction_id, category_id, amount, note)
  values (v_tx_income, v_cat_income, 1000, 'E2E: split');
end $$;
