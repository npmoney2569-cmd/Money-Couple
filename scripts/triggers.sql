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
-- Verify: list all triggers on transactions
-- =============================================================
-- select trigger_name, event_manipulation, action_timing
-- from information_schema.triggers
-- where event_object_table = 'transactions'
-- order by trigger_name;
