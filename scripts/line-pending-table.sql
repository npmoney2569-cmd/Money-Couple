-- LINE Bot Pending Transactions
-- เก็บ state ชั่วคราวก่อนผู้ใช้เลือกบัญชี (expire 10 นาที)
create table if not exists public.line_pending_transactions (
  id              uuid primary key default gen_random_uuid(),
  line_user_id    varchar(50)   not null unique, -- 1 pending per LINE user
  user_id         uuid          not null references public.users(id) on delete cascade,
  type            varchar(10)   not null check (type in ('income','expense')),
  amount          decimal(15,2) not null,
  category_id     uuid          references public.categories(id) on delete set null,
  category_name   varchar(200),
  note            text,
  expires_at      timestamptz   not null default now() + interval '10 minutes',
  created_at      timestamptz   not null default now()
);

-- Auto cleanup expired rows
create index if not exists idx_line_pending_expires on public.line_pending_transactions(expires_at);

-- Grant permissions
grant select, insert, update, delete on public.line_pending_transactions to service_role;
alter table public.line_pending_transactions enable row level security;

-- Service role bypasses RLS
create policy "line_pending_service_role" on public.line_pending_transactions
  for all
  using (true)
  with check (true);
