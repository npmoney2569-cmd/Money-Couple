-- =============================================================
-- CMN — Phase 3: Shared Accounts Schema Extension
-- =============================================================

alter table public.accounts add column if not exists couple_id uuid references public.couples(id) on delete cascade;

drop policy if exists accounts_own on public.accounts;
drop policy if exists accounts_own_or_couple on public.accounts;
create policy accounts_own_or_couple on public.accounts
  for all
  using (
    user_id = auth.uid() or
    (couple_id is not null and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = accounts.couple_id
        and cm.user_id = auth.uid()
    ))
  )
  with check (
    user_id = auth.uid() or
    (couple_id is not null and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = accounts.couple_id
        and cm.user_id = auth.uid()
    ))
  );
