-- Fix RLS policy for relationship_invites to break infinite recursion with users table

drop policy if exists relationship_invites_policy on public.relationship_invites;

create policy relationship_invites_policy on public.relationship_invites
  for all
  using (
    from_user_id = auth.uid() or
    to_email = coalesce(auth.jwt() ->> 'email', '')
  )
  with check (
    from_user_id = auth.uid() or
    to_email = coalesce(auth.jwt() ->> 'email', '')
  );
