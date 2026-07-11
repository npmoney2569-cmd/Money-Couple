-- Fix RLS policies for public.users to support Couple Mode profiles loading without infinite recursion

-- 1. Drop existing policies
drop policy if exists users_own on public.users;
drop policy if exists users_own_all on public.users;
drop policy if exists users_select_couple on public.users;
drop policy if exists users_select_invite on public.users;

-- 2. Owner has full control
create policy users_own_all on public.users
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- 3. Couple members can read each other's user profiles
create policy users_select_couple on public.users
  for select
  using (
    exists (
      select 1 from public.couple_members cm1
      join public.couple_members cm2 on cm1.couple_id = cm2.couple_id
      where cm1.user_id = users.id
        and cm2.user_id = auth.uid()
    )
  );

-- 4. Invite sender/recipient can read each other's profiles
-- We use auth.jwt() ->> 'email' to avoid referencing public.users table recursively
create policy users_select_invite on public.users
  for select
  using (
    exists (
      select 1 from public.relationship_invites ri
      where (ri.from_user_id = users.id and ri.to_email = coalesce(auth.jwt() ->> 'email', ''))
         or (ri.from_user_id = auth.uid() and ri.to_email = users.email)
    )
  );
