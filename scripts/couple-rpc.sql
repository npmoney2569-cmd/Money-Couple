-- =============================================================
-- CMN — Phase 3: RPC Function for Accepting Couple Invites
-- =============================================================

create or replace function public.accept_couple_invite(p_invite_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_invite record;
  v_couple_id uuid;
  v_curr_user_id uuid;
  v_curr_user_email varchar(255);
begin
  -- Get current authenticated user ID
  v_curr_user_id := auth.uid();
  if v_curr_user_id is null then
    raise exception 'Unauthorized: Must be logged in';
  end if;

  -- Get current user email from profiles table
  select email into v_curr_user_email from public.users where id = v_curr_user_id;

  -- Fetch the pending invite
  select * into v_invite 
  from public.relationship_invites 
  where id = p_invite_id;
  
  if v_invite is null then
    raise exception 'Invite not found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Invite is not pending';
  end if;

  -- Verify that the invite's to_email matches current user's email
  if lower(v_invite.to_email) <> lower(v_curr_user_email) then
    raise exception 'Unauthorized: Invite email does not match your email';
  end if;

  -- Check if current user is already in any couple
  if exists (
    select 1 from public.couple_members where user_id = v_curr_user_id
  ) then
    raise exception 'Conflict: You are already a member of a couple';
  end if;

  -- Check if sender user is already in any couple
  if exists (
    select 1 from public.couple_members where user_id = v_invite.from_user_id
  ) then
    raise exception 'Conflict: The sender is already a member of a couple';
  end if;

  -- 1. Create a new couple record
  insert into public.couples (name)
  values ('คู่รักของ ' || (select coalesce(display_name, email) from public.users where id = v_invite.from_user_id))
  returning id into v_couple_id;

  -- 2. Add the sender as 'owner'
  insert into public.couple_members (couple_id, user_id, role, permission)
  values (v_couple_id, v_invite.from_user_id, 'owner', 'edit');

  -- 3. Add the current user as 'member'
  insert into public.couple_members (couple_id, user_id, role, permission)
  values (v_couple_id, v_curr_user_id, 'member', 'edit');

  -- 4. Update the invite status
  update public.relationship_invites
  set status = 'accepted',
      couple_id = v_couple_id
  where id = p_invite_id;

  return v_couple_id;
end;
$$;
