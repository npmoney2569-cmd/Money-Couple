-- =============================================================
-- CMN — Phase 3: Couple Mode & Splits Schema Extensions
-- =============================================================

-- 1. Extend budgets and goals for shared use
alter table public.budgets add column if not exists couple_id uuid references public.couples(id) on delete cascade;
alter table public.goals add column if not exists couple_id uuid references public.couples(id) on delete cascade;

-- 2. Enable RLS on core couples tables (they were not enabled in original schema)
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.relationship_invites enable row level security;

-- 3. Create tables for Splits & Settlements
create table if not exists public.couple_splits (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid          not null references public.transactions(id) on delete cascade,
  couple_id      uuid          not null references public.couples(id) on delete cascade,
  split_type     varchar(20)   not null check (split_type in ('equal', 'percentage', 'ratio', 'exact')),
  details        jsonb         not null, -- array of { user_id, amount, share_value }
  created_at     timestamptz   not null default now()
);

create table if not exists public.couple_settlements (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid          not null references public.couples(id) on delete cascade,
  from_user_id   uuid          not null references public.users(id) on delete cascade,
  to_user_id     uuid          not null references public.users(id) on delete cascade,
  amount         decimal(15,2) not null check (amount > 0),
  date           date          not null default current_date,
  note           text,
  created_at     timestamptz   not null default now()
);

create index if not exists idx_couple_splits_tx on public.couple_splits(transaction_id);
create index if not exists idx_couple_splits_couple on public.couple_splits(couple_id);
create index if not exists idx_couple_settlements_couple on public.couple_settlements(couple_id);

alter table public.couple_splits enable row level security;
alter table public.couple_settlements enable row level security;

-- 4. RLS Policies

-- couples: members can read/write
drop policy if exists couples_member on public.couples;
create policy couples_member on public.couples
  for all
  using (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couples.id
        and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couples.id
        and cm.user_id = auth.uid()
    )
  );

-- couple_members: members can read, only admin/members can write (keep simple for now: own couple details)
drop policy if exists couple_members_own_couple on public.couple_members;
create policy couple_members_own_couple on public.couple_members
  for all
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_members.couple_id
        and cm.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid() or
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_members.couple_id
        and cm.user_id = auth.uid()
    )
  );

-- relationship_invites: sent by user, or received by user (based on registered email)
drop policy if exists relationship_invites_policy on public.relationship_invites;
create policy relationship_invites_policy on public.relationship_invites
  for all
  using (
    from_user_id = auth.uid() or
    to_email = (select email from public.users where id = auth.uid())
  )
  with check (
    from_user_id = auth.uid() or
    to_email = (select email from public.users where id = auth.uid())
  );

-- budgets: own or couple's budget
drop policy if exists budgets_own on public.budgets;
drop policy if exists budgets_own_or_couple on public.budgets;
create policy budgets_own_or_couple on public.budgets
  for all
  using (
    user_id = auth.uid() or
    (couple_id is not null and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = budgets.couple_id
        and cm.user_id = auth.uid()
    ))
  )
  with check (
    user_id = auth.uid() or
    (couple_id is not null and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = budgets.couple_id
        and cm.user_id = auth.uid()
    ))
  );

-- goals: own or couple's goal
drop policy if exists goals_own on public.goals;
drop policy if exists goals_own_or_couple on public.goals;
create policy goals_own_or_couple on public.goals
  for all
  using (
    user_id = auth.uid() or
    (couple_id is not null and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = goals.couple_id
        and cm.user_id = auth.uid()
    ))
  )
  with check (
    user_id = auth.uid() or
    (couple_id is not null and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = goals.couple_id
        and cm.user_id = auth.uid()
    ))
  );

-- couple_splits: members of the couple can read/write
drop policy if exists couple_splits_member on public.couple_splits;
create policy couple_splits_member on public.couple_splits
  for all
  using (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_splits.couple_id
        and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_splits.couple_id
        and cm.user_id = auth.uid()
    )
  );

-- couple_settlements: members of the couple can read/write
drop policy if exists couple_settlements_member on public.couple_settlements;
create policy couple_settlements_member on public.couple_settlements
  for all
  using (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_settlements.couple_id
        and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_settlements.couple_id
        and cm.user_id = auth.uid()
    )
  );
