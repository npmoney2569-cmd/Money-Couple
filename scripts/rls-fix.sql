-- Default user ownership
alter table public.categories alter column user_id set default auth.uid();
alter table public.accounts alter column user_id set default auth.uid();
alter table public.tags alter column user_id set default auth.uid();
alter table public.transactions alter column user_id set default auth.uid();
alter table public.budgets alter column user_id set default auth.uid();
alter table public.goals alter column user_id set default auth.uid();
alter table public.debts alter column user_id set default auth.uid();
alter table public.assets alter column user_id set default auth.uid();
alter table public.bills_subscriptions alter column user_id set default auth.uid();
alter table public.recurring_transactions alter column user_id set default auth.uid();
alter table public.notifications alter column user_id set default auth.uid();
alter table public.audit_logs alter column user_id set default auth.uid();
alter table public.auth_providers alter column user_id set default auth.uid();

-- Core own-table policies

drop policy if exists users_own on public.users;
create policy users_own on public.users
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists auth_providers_own on public.auth_providers;
create policy auth_providers_own on public.auth_providers
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists accounts_own on public.accounts;
create policy accounts_own on public.accounts
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists tags_own on public.tags;
create policy tags_own on public.tags
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists transactions_own on public.transactions;
create policy transactions_own on public.transactions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists budgets_own on public.budgets;
create policy budgets_own on public.budgets
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists goals_own on public.goals;
create policy goals_own on public.goals
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists debts_own on public.debts;
create policy debts_own on public.debts
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists assets_own on public.assets;
create policy assets_own on public.assets
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists bills_own on public.bills_subscriptions;
create policy bills_own on public.bills_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists recurring_own on public.recurring_transactions;
create policy recurring_own on public.recurring_transactions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists audit_own on public.audit_logs;
create policy audit_own on public.audit_logs
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- categories needs preset read for all users, but custom rows owned by user

drop policy if exists categories_own_or_preset on public.categories;
drop policy if exists categories_select_own_or_preset on public.categories;
drop policy if exists categories_insert_own on public.categories;
drop policy if exists categories_update_own on public.categories;
drop policy if exists categories_delete_own on public.categories;

create policy categories_select_own_or_preset on public.categories
  for select
  using (user_id = auth.uid() or user_id is null);

create policy categories_insert_own on public.categories
  for insert
  with check (user_id = auth.uid());

create policy categories_update_own on public.categories
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy categories_delete_own on public.categories
  for delete
  using (user_id = auth.uid());

-- relation tables with ownership through parent rows

drop policy if exists transaction_splits_own on public.transaction_splits;
create policy transaction_splits_own on public.transaction_splits
  for all
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_splits.transaction_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_splits.transaction_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists transaction_tags_own on public.transaction_tags;
create policy transaction_tags_own on public.transaction_tags
  for all
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_tags.transaction_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_tags.transaction_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists goal_transactions_own on public.goal_transactions;
create policy goal_transactions_own on public.goal_transactions
  for all
  using (
    exists (
      select 1 from public.goals g
      where g.id = goal_transactions.goal_id
        and g.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.goals g
      where g.id = goal_transactions.goal_id
        and g.user_id = auth.uid()
    )
  );

drop policy if exists debt_schedules_own on public.debt_schedules;
create policy debt_schedules_own on public.debt_schedules
  for all
  using (
    exists (
      select 1 from public.debts d
      where d.id = debt_schedules.debt_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.debts d
      where d.id = debt_schedules.debt_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists asset_valuations_own on public.asset_valuations;
create policy asset_valuations_own on public.asset_valuations
  for all
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_valuations.asset_id
        and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.assets a
      where a.id = asset_valuations.asset_id
        and a.user_id = auth.uid()
    )
  );
