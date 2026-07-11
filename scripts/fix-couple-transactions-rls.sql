-- Fix RLS policies for transactions and categories to support Couple Mode

-- 1. Update transactions RLS
drop policy if exists transactions_own on public.transactions;
drop policy if exists transactions_own_all on public.transactions;
drop policy if exists transactions_select_couple on public.transactions;

-- Owner has full control
create policy transactions_own_all on public.transactions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Couple members can read (SELECT) each other's transactions
create policy transactions_select_couple on public.transactions
  for select
  using (
    exists (
      select 1 from public.couple_members cm1
      join public.couple_members cm2 on cm1.couple_id = cm2.couple_id
      where cm1.user_id = transactions.user_id
        and cm2.user_id = auth.uid()
    )
  );

-- 2. Update categories RLS
drop policy if exists categories_select_own_or_preset on public.categories;
drop policy if exists categories_select_couple on public.categories;

-- Owner or preset categories
create policy categories_select_own_or_preset on public.categories
  for select
  using (user_id = auth.uid() or is_preset = true);

-- Couple members can read each other's categories
create policy categories_select_couple on public.categories
  for select
  using (
    exists (
      select 1 from public.couple_members cm1
      join public.couple_members cm2 on cm1.couple_id = cm2.couple_id
      where cm1.user_id = categories.user_id
        and cm2.user_id = auth.uid()
    )
  );
