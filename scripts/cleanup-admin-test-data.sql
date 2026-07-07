do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from public.users
  where email = 'admin@cmn.local'
  limit 1;

  if v_user_id is null then
    raise exception 'admin user not found in public.users';
  end if;

  -- Remove transactional data first to satisfy FK restrictions.
  delete from public.transaction_splits
  where transaction_id in (
    select id from public.transactions where user_id = v_user_id
  );

  delete from public.transaction_tags
  where transaction_id in (
    select id from public.transactions where user_id = v_user_id
  );

  delete from public.transactions where user_id = v_user_id;

  -- Remove all user-owned planning and reference records.
  delete from public.budgets where user_id = v_user_id;
  delete from public.recurring_transactions where user_id = v_user_id;
  delete from public.bills_subscriptions where user_id = v_user_id;
  delete from public.notifications where user_id = v_user_id;
  delete from public.audit_logs where user_id = v_user_id;

  -- Child rows cascade from parent goals/debts/assets.
  delete from public.goals where user_id = v_user_id;
  delete from public.debts where user_id = v_user_id;
  delete from public.assets where user_id = v_user_id;

  -- Remove user-owned lookup data.
  delete from public.tags where user_id = v_user_id;
  delete from public.categories where user_id = v_user_id and coalesce(is_preset, false) = false;

  -- Remove accounts last after transaction cleanup.
  delete from public.accounts where user_id = v_user_id;
end $$;
