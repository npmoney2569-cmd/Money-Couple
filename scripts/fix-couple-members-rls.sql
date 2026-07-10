-- =============================================================
-- CMN — Fix couple_members RLS Infinite Recursion
-- =============================================================

-- Drop the recursive policy
drop policy if exists couple_members_own_couple on public.couple_members;

-- Create simple, non-recursive policies
-- 1. Anyone authenticated can read memberships (safe, as it only maps user UUIDs to couple UUIDs)
create policy couple_members_select on public.couple_members
  for select
  using (auth.uid() is not null);

-- 2. Users can only insert their own membership mapping
create policy couple_members_insert on public.couple_members
  for insert
  with check (auth.uid() = user_id);

-- 3. Users can only update their own membership mapping
create policy couple_members_update on public.couple_members
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Users can only delete their own membership mapping
create policy couple_members_delete on public.couple_members
  for delete
  using (auth.uid() = user_id);
