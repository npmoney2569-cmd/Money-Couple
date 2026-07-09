-- =============================================================
-- CMN — Database Triggers: Account Balance Auto-Update
-- Run in Supabase SQL Editor AFTER running schema.sql
-- =============================================================

-- =============================================================
-- Helper: apply a balance delta to one account
-- =============================================================
create or replace function public.apply_account_balance_delta(
  p_account_id uuid,
  p_delta      decimal
)
returns void language plpgsql security definer as $$
begin
  update public.accounts
  set    balance    = balance + p_delta,
         updated_at = now()
  where  id = p_account_id;
end;
$$;

-- =============================================================
-- Helper: reverse a transaction's effect on balances
-- =============================================================
create or replace function public.reverse_transaction_balance(
  p_type          text,
  p_account_id    uuid,
  p_to_account_id uuid,
  p_amount        decimal,
  p_fee           decimal
)
returns void language plpgsql security definer as $$
begin
  if p_type = 'income' then
    perform public.apply_account_balance_delta(p_account_id, -p_amount);

  elsif p_type = 'expense' then
    perform public.apply_account_balance_delta(p_account_id, p_amount);

  elsif p_type = 'transfer' then
    -- restore from-account (add back amount + fee)
    perform public.apply_account_balance_delta(p_account_id,  p_amount + coalesce(p_fee, 0));
    -- restore to-account (subtract amount)
    perform public.apply_account_balance_delta(p_to_account_id, -p_amount);
  end if;
end;
$$;

-- =============================================================
-- Helper: apply a transaction's effect on balances
-- =============================================================
create or replace function public.apply_transaction_balance(
  p_type          text,
  p_account_id    uuid,
  p_to_account_id uuid,
  p_amount        decimal,
  p_fee           decimal
)
returns void language plpgsql security definer as $$
begin
  if p_type = 'income' then
    perform public.apply_account_balance_delta(p_account_id, p_amount);

  elsif p_type = 'expense' then
    perform public.apply_account_balance_delta(p_account_id, -p_amount);

  elsif p_type = 'transfer' then
    -- deduct amount + fee from source
    perform public.apply_account_balance_delta(p_account_id,    -(p_amount + coalesce(p_fee, 0)));
    -- credit amount to destination
    perform public.apply_account_balance_delta(p_to_account_id,  p_amount);
  end if;
end;
$$;

-- =============================================================
-- Trigger function: INSERT
-- =============================================================
create or replace function public.trg_transaction_after_insert()
returns trigger language plpgsql security definer as $$
begin
  -- Only apply if not already soft-deleted (edge case: insert with deleted_at set)
  if new.deleted_at is null then
    perform public.apply_transaction_balance(
      new.type, new.account_id, new.to_account_id, new.amount, new.fee_amount
    );
  end if;
  return new;
end;
$$;

-- =============================================================
-- Trigger function: UPDATE
-- =============================================================
create or replace function public.trg_transaction_after_update()
returns trigger language plpgsql security definer as $$
begin
  -- Case 1: soft-delete (deleted_at was NULL, now set) → reverse old balance
  if old.deleted_at is null and new.deleted_at is not null then
    perform public.reverse_transaction_balance(
      old.type, old.account_id, old.to_account_id, old.amount, old.fee_amount
    );
    return new;
  end if;

  -- Case 2: restore from soft-delete (deleted_at was set, now cleared) → apply new balance
  if old.deleted_at is not null and new.deleted_at is null then
    perform public.apply_transaction_balance(
      new.type, new.account_id, new.to_account_id, new.amount, new.fee_amount
    );
    return new;
  end if;

  -- Case 3: already soft-deleted and stays deleted → no balance change
  if new.deleted_at is not null then
    return new;
  end if;

  -- Case 4: regular update of an active transaction
  --   step a) reverse old values
  perform public.reverse_transaction_balance(
    old.type, old.account_id, old.to_account_id, old.amount, old.fee_amount
  );
  --   step b) apply new values
  perform public.apply_transaction_balance(
    new.type, new.account_id, new.to_account_id, new.amount, new.fee_amount
  );

  return new;
end;
$$;

-- =============================================================
-- Trigger function: DELETE (hard delete)
-- =============================================================
create or replace function public.trg_transaction_after_delete()
returns trigger language plpgsql security definer as $$
begin
  -- Only reverse if the transaction was not already soft-deleted
  if old.deleted_at is null then
    perform public.reverse_transaction_balance(
      old.type, old.account_id, old.to_account_id, old.amount, old.fee_amount
    );
  end if;
  return old;
end;
$$;

-- =============================================================
-- Attach triggers to transactions table
-- =============================================================
drop trigger if exists trg_transaction_after_insert on public.transactions;
create trigger trg_transaction_after_insert
  after insert on public.transactions
  for each row execute procedure public.trg_transaction_after_insert();

drop trigger if exists trg_transaction_after_update on public.transactions;
create trigger trg_transaction_after_update
  after update on public.transactions
  for each row execute procedure public.trg_transaction_after_update();

drop trigger if exists trg_transaction_after_delete on public.transactions;
create trigger trg_transaction_after_delete
  after delete on public.transactions
  for each row execute procedure public.trg_transaction_after_delete();

-- =============================================================
-- Split validation: total split amount must not exceed transaction amount
-- and split is only allowed for income/expense (not transfer)
-- =============================================================
create or replace function public.validate_transaction_split_total()
returns trigger language plpgsql security definer as $$
declare
  v_transaction_amount decimal(15,2);
  v_transaction_type text;
  v_total_splits decimal(15,2);
begin
  select amount, type
  into v_transaction_amount, v_transaction_type
  from public.transactions
  where id = new.transaction_id
  limit 1;

  if v_transaction_amount is null then
    raise exception 'Transaction not found for split: %', new.transaction_id;
  end if;

  if v_transaction_type = 'transfer' then
    raise exception 'Split transaction is not allowed for transfer type';
  end if;

  select coalesce(sum(amount), 0)
  into v_total_splits
  from public.transaction_splits
  where transaction_id = new.transaction_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_total_splits := v_total_splits + coalesce(new.amount, 0);

  if v_total_splits > v_transaction_amount then
    raise exception
      'Split total (%.2f) exceeds transaction amount (%.2f)',
      v_total_splits,
      v_transaction_amount;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_transaction_split_total on public.transaction_splits;
create trigger trg_validate_transaction_split_total
  before insert or update on public.transaction_splits
  for each row execute procedure public.validate_transaction_split_total();

-- =============================================================
-- Budget Exceeded notification trigger
-- =============================================================
create or replace function public.check_budget_exceeded()
returns trigger language plpgsql security definer as $$
declare
  v_budget_amount decimal(15,2);
  v_budget_id uuid;
  v_total_expenses decimal(15,2);
  v_month_start date;
  v_month_end date;
  v_category_name varchar(100);
begin
  -- Only check if this is an expense transaction and not deleted
  if new.type = 'expense' and new.deleted_at is null then
    -- Get current transaction month boundaries
    v_month_start := date_trunc('month', new.date)::date;
    v_month_end := (date_trunc('month', new.date) + interval '1 month' - interval '1 day')::date;

    -- Find if there is an active budget for this user and category in this period
    select id, amount into v_budget_id, v_budget_amount
    from public.budgets
    where user_id = new.user_id
      and category_id = new.category_id
      and period = 'monthly'
      and start_date <= new.date
      and (end_date is null or end_date >= new.date)
    limit 1;

    -- If no category budget, check for a total budget (category_id is null)
    if v_budget_id is null then
      select id, amount into v_budget_id, v_budget_amount
      from public.budgets
      where user_id = new.user_id
        and category_id is null
        and period = 'monthly'
        and start_date <= new.date
        and (end_date is null or end_date >= new.date)
      limit 1;
    end if;

    if v_budget_id is not null then
      -- Calculate total expenses for this budget's category (or all categories if total budget)
      if new.category_id is not null then
        select coalesce(sum(amount), 0) into v_total_expenses
        from public.transactions
        where user_id = new.user_id
          and type = 'expense'
          and category_id = new.category_id
          and date >= v_month_start
          and date <= v_month_end
          and deleted_at is null;
      else
        select coalesce(sum(amount), 0) into v_total_expenses
        from public.transactions
        where user_id = new.user_id
          and type = 'expense'
          and date >= v_month_start
          and date <= v_month_end
          and deleted_at is null;
      end if;

      -- If we exceeded the budget limit
      if v_total_expenses > v_budget_amount then
        -- Get category name
        if new.category_id is not null then
          select name into v_category_name from public.categories where id = new.category_id;
        else
          v_category_name := 'รวมทั้งหมด';
        end if;

        -- Prevent duplicate notifications for this budget in the same month
        if not exists (
          select 1 from public.notifications
          where user_id = new.user_id
            and type = 'budget_exceeded'
            and created_at >= date_trunc('month', now())
            and body like '%' || v_category_name || '%'
        ) then
          insert into public.notifications (user_id, type, title, body, sent_via)
          values (
            new.user_id,
            'budget_exceeded',
            'งบประมาณเกินกำหนด! ⚠️',
            'ค่าใช้จ่ายสำหรับหมวดหมู่ "' || v_category_name || '" ในเดือนนี้คือ ฿' || trim(to_char(v_total_expenses, '999,999,999.99')) || ' ซึ่งเกินกว่างบประมาณที่ตั้งไว้ ฿' || trim(to_char(v_budget_amount, '999,999,999.99')),
            'push'
          );
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_budget_exceeded on public.transactions;
create trigger trg_check_budget_exceeded
  after insert or update on public.transactions
  for each row execute procedure public.check_budget_exceeded();


-- =============================================================
-- Goal Achieved / Balance Sync notification trigger
-- =============================================================
create or replace function public.check_goal_achieved()
returns trigger language plpgsql security definer as $$
declare
  v_goal_id uuid;
  v_goal_name varchar(200);
  v_target_amount decimal(15,2);
begin
  -- Only trigger if this is a savings account and balance increased
  if new.type = 'savings' and new.balance > old.balance then
    -- Find if a goal is linked to this account
    select id, name, target_amount into v_goal_id, v_goal_name, v_target_amount
    from public.goals
    where account_id = new.id
    limit 1;

    if v_goal_id is not null then
      -- Sync goals.current_amount with accounts.balance
      update public.goals
      set current_amount = new.balance
      where id = v_goal_id;

      -- If new balance reaches target and old balance did not
      if new.balance >= v_target_amount and old.balance < v_target_amount then
        -- Prevent duplicate notifications for this goal
        if not exists (
          select 1 from public.notifications
          where user_id = new.user_id
            and type = 'goal_reached'
            and body like '%' || v_goal_name || '%'
        ) then
          insert into public.notifications (user_id, type, title, body, sent_via)
          values (
            new.user_id,
            'goal_reached',
            'เป้าหมายการออมสำเร็จ! 🎉',
            'ยินดีด้วย! คุณสามารถเก็บออมเงินบรรลุเป้าหมาย "' || v_goal_name || '" ครบ ฿' || trim(to_char(v_target_amount, '999,999,999.00')) || ' เรียบร้อยแล้ว 🎯',
            'push'
          );
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_goal_achieved on public.accounts;
create trigger trg_check_goal_achieved
  after update on public.accounts
  for each row execute procedure public.check_goal_achieved();


-- =============================================================
-- Generic Entity Audit Logging Trigger
-- =============================================================
create or replace function public.log_entity_audit()
returns trigger language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_action varchar(10);
  v_details jsonb;
begin
  if TG_OP = 'INSERT' then
    v_user_id := coalesce(new.user_id, auth.uid());
    v_action := 'create';
    v_details := to_jsonb(new);
  elsif TG_OP = 'UPDATE' then
    v_user_id := coalesce(new.user_id, auth.uid());
    v_action := 'update';
    v_details := jsonb_build_object(
      'old', to_jsonb(old),
      'new', to_jsonb(new)
    );
  elsif TG_OP = 'DELETE' then
    v_user_id := coalesce(old.user_id, auth.uid());
    v_action := 'delete';
    v_details := to_jsonb(old);
  end if;

  if v_user_id is not null then
    insert into public.audit_logs (user_id, entity_type, entity_id, action, details)
    values (
      v_user_id,
      TG_TABLE_NAME,
      coalesce(new.id, old.id),
      v_action,
      v_details
    );
  end if;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists trg_audit_transactions on public.transactions;
create trigger trg_audit_transactions
  after insert or update or delete on public.transactions
  for each row execute procedure public.log_entity_audit();

drop trigger if exists trg_audit_budgets on public.budgets;
create trigger trg_audit_budgets
  after insert or update or delete on public.budgets
  for each row execute procedure public.log_entity_audit();

drop trigger if exists trg_audit_goals on public.goals;
create trigger trg_audit_goals
  after insert or update or delete on public.goals
  for each row execute procedure public.log_entity_audit();

drop trigger if exists trg_audit_debts on public.debts;
create trigger trg_audit_debts
  after insert or update or delete on public.debts
  for each row execute procedure public.log_entity_audit();

drop trigger if exists trg_audit_assets on public.assets;
create trigger trg_audit_assets
  after insert or update or delete on public.assets
  for each row execute procedure public.log_entity_audit();

drop trigger if exists trg_audit_bills on public.bills_subscriptions;
create trigger trg_audit_bills
  after insert or update or delete on public.bills_subscriptions
  for each row execute procedure public.log_entity_audit();


-- =============================================================
-- Verify: list all triggers on transactions
-- =============================================================
-- select trigger_name, event_manipulation, action_timing
-- from information_schema.triggers
-- where event_object_table = 'transactions'
-- order by trigger_name;
