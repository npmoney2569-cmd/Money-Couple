-- =============================================================
-- CMN — Master GRANT Script
-- แก้ปัญหา RLS / Permission ทุกตารางครั้งเดียวจบ
-- Run ใน Supabase SQL Editor ทุกครั้งที่เพิ่มตารางใหม่
-- =============================================================

-- CORE: Grant schema usage ให้ทุก role ที่ใช้
grant usage on schema public to anon, authenticated, service_role;

-- =============================================================
-- ตาราง User-owned ทั้งหมด
-- authenticated = ผู้ใช้ที่ login แล้ว (ใช้ใน client)
-- service_role  = Admin/Server (ใช้ใน API routes เช่น LINE callback)
-- =============================================================

grant select, insert, update, delete on public.users                 to authenticated, service_role;
grant select, insert, update, delete on public.auth_providers        to authenticated, service_role;
grant select, insert, update, delete on public.accounts              to authenticated, service_role;
grant select, insert, update, delete on public.categories            to authenticated, service_role;
grant select, insert, update, delete on public.tags                  to authenticated, service_role;
grant select, insert, update, delete on public.transactions          to authenticated, service_role;
grant select, insert, update, delete on public.transaction_splits    to authenticated, service_role;
grant select, insert, update, delete on public.transaction_tags      to authenticated, service_role;
grant select, insert, update, delete on public.budgets               to authenticated, service_role;
grant select, insert, update, delete on public.goals                 to authenticated, service_role;
grant select, insert, update, delete on public.goal_transactions     to authenticated, service_role;
grant select, insert, update, delete on public.debts                 to authenticated, service_role;
grant select, insert, update, delete on public.debt_schedules        to authenticated, service_role;
grant select, insert, update, delete on public.assets                to authenticated, service_role;
grant select, insert, update, delete on public.asset_valuations      to authenticated, service_role;
grant select, insert, update, delete on public.bills_subscriptions   to authenticated, service_role;
grant select, insert, update, delete on public.recurring_transactions to authenticated, service_role;
grant select, insert, update, delete on public.notifications         to authenticated, service_role;
grant select, insert, update, delete on public.audit_logs            to authenticated, service_role;

-- =============================================================
-- ตาราง Couple Mode
-- =============================================================

grant select, insert, update, delete on public.couples              to authenticated, service_role;
grant select, insert, update, delete on public.couple_members       to authenticated, service_role;
grant select, insert, update, delete on public.relationship_invites to authenticated, service_role;
grant select, insert, update, delete on public.couple_splits        to authenticated, service_role;
grant select, insert, update, delete on public.couple_settlements   to authenticated, service_role;

-- =============================================================
-- Sequences (UUID gen ต้องการ USAGE)
-- =============================================================

grant usage on all sequences in schema public to authenticated, service_role;

-- =============================================================
-- Functions / RPCs (ใช้ใน Couple Mode)
-- =============================================================

grant execute on function public.accept_couple_invite(uuid)         to authenticated, service_role;
grant execute on function public.apply_account_balance_delta(uuid, decimal) to authenticated, service_role;
grant execute on function public.apply_transaction_balance(text, uuid, uuid, decimal, decimal) to authenticated, service_role;
grant execute on function public.reverse_transaction_balance(text, uuid, uuid, decimal, decimal) to authenticated, service_role;

-- =============================================================
-- anon: เฉพาะที่จำเป็น (ไม่ให้อ่านข้อมูล user)
-- =============================================================

-- anon ไม่ควรเข้าถึงตาราง user data ใดๆ (RLS ดูแลอยู่แล้ว)
-- แต่ต้องการ execute functions บางตัว
grant execute on function public.handle_new_user() to service_role;

-- =============================================================
-- ตรวจสอบว่า RLS เปิดอยู่ครบทุกตาราง (ไม่เปลี่ยน policy เดิม)
-- =============================================================

alter table public.users                  enable row level security;
alter table public.auth_providers         enable row level security;
alter table public.accounts               enable row level security;
alter table public.categories             enable row level security;
alter table public.tags                   enable row level security;
alter table public.transactions           enable row level security;
alter table public.transaction_splits     enable row level security;
alter table public.transaction_tags       enable row level security;
alter table public.budgets                enable row level security;
alter table public.goals                  enable row level security;
alter table public.goal_transactions      enable row level security;
alter table public.debts                  enable row level security;
alter table public.debt_schedules         enable row level security;
alter table public.assets                 enable row level security;
alter table public.asset_valuations       enable row level security;
alter table public.bills_subscriptions    enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.notifications          enable row level security;
alter table public.audit_logs             enable row level security;
alter table public.couples                enable row level security;
alter table public.couple_members         enable row level security;
alter table public.relationship_invites   enable row level security;
alter table public.couple_splits          enable row level security;
alter table public.couple_settlements     enable row level security;
