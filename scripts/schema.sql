-- =============================================================
-- CMN — Complete Database Schema (PostgreSQL / Supabase)
-- Version: 2.0  |  Generated: 2026-07-07
-- Run this in Supabase SQL Editor (or psql)
-- =============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- =============================================================
-- 1. users  (mirrors Supabase auth.users)
-- =============================================================
create table if not exists public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    varchar(100)  not null default '',
  email           varchar(255)  unique,
  avatar_url      text,
  locale          varchar(10)   not null default 'th',
  currency        varchar(3)    not null default 'THB',
  date_format     varchar(20)   not null default 'DD/MM/YYYY',
  theme           varchar(10)   not null default 'system' check (theme in ('light','dark','system')),
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now(),
  deleted_at      timestamptz
);

comment on table public.users is 'User profiles synced from auth.users';

-- =============================================================
-- 1.1 auth_providers
-- =============================================================
create table if not exists public.auth_providers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid          not null references public.users(id) on delete cascade,
  provider       varchar(20)   not null check (provider in ('email','google','apple','line')),
  provider_uid   varchar(255)  not null,
  password_hash  varchar(255),
  line_user_id   varchar(50),
  created_at     timestamptz   not null default now(),
  unique (provider, provider_uid)
);

create index if not exists idx_auth_providers_user_id on public.auth_providers(user_id);
create index if not exists idx_auth_providers_provider on public.auth_providers(provider);

comment on table public.auth_providers is 'Linked authentication providers per user';

-- Auto-create user profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================
-- 2. accounts
-- =============================================================
create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid          not null references public.users(id) on delete cascade,
  name            varchar(100)  not null,
  type            varchar(20)   not null check (type in ('cash','bank','credit_card','e_wallet','investment')),
  balance         decimal(15,2) not null default 0,
  initial_balance decimal(15,2) not null default 0,
  currency        varchar(3)    not null default 'THB',
  icon            varchar(50),
  color           varchar(7),
  is_active       boolean       not null default true,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create index if not exists idx_accounts_user_id on public.accounts(user_id);
create index if not exists idx_accounts_user_active on public.accounts(user_id, is_active);

comment on table public.accounts is 'Financial accounts (cash, bank, credit card, e-wallet, investment)';

-- =============================================================
-- 3. categories
-- =============================================================
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid          references public.users(id) on delete cascade,  -- null = preset
  name        varchar(100)  not null,
  type        varchar(10)   not null check (type in ('income','expense')),
  icon        varchar(50),
  color       varchar(7),
  is_preset   boolean       not null default false,
  parent_id   uuid          references public.categories(id) on delete set null,
  sort_order  int           not null default 0,
  created_at  timestamptz   not null default now()
);

create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_categories_type on public.categories(type);
create index if not exists idx_categories_preset on public.categories(is_preset);

comment on table public.categories is 'Transaction categories; user_id=NULL means preset for all users';

-- =============================================================
-- 4. tags
-- =============================================================
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid          not null references public.users(id) on delete cascade,
  name        varchar(50)   not null,
  color       varchar(7),
  created_at  timestamptz   not null default now(),
  unique (user_id, name)
);

create index if not exists idx_tags_user_id on public.tags(user_id);

-- =============================================================
-- 5. transactions
-- =============================================================
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid          not null references public.users(id) on delete cascade,
  type          varchar(10)   not null check (type in ('income','expense','transfer')),
  amount        decimal(15,2) not null check (amount > 0),
  date          date          not null,
  account_id    uuid          not null references public.accounts(id) on delete restrict,
  to_account_id uuid          references public.accounts(id) on delete restrict,   -- transfer only
  category_id   uuid          references public.categories(id) on delete set null,  -- null allowed for transfer
  payee         varchar(200),   -- income: who paid us
  merchant      varchar(200),   -- expense: where we paid
  note          text,
  receipt_url   text,
  source        varchar(10)   not null default 'app' check (source in ('app','line_bot','ocr')),
  fee_amount    decimal(15,2),
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),
  deleted_at    timestamptz
);

create index if not exists idx_transactions_user_id         on public.transactions(user_id);
create index if not exists idx_transactions_user_date       on public.transactions(user_id, date desc);
create index if not exists idx_transactions_account_id      on public.transactions(account_id);
create index if not exists idx_transactions_category_id     on public.transactions(category_id);
create index if not exists idx_transactions_type_date       on public.transactions(type, date desc);
create index if not exists idx_transactions_deleted_at      on public.transactions(deleted_at) where deleted_at is null;

comment on table public.transactions is 'All financial transactions (income, expense, transfer)';

-- =============================================================
-- 6. transaction_splits
-- =============================================================
create table if not exists public.transaction_splits (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid          not null references public.transactions(id) on delete cascade,
  category_id    uuid          not null references public.categories(id) on delete restrict,
  amount         decimal(15,2) not null,
  note           text
);

create index if not exists idx_tx_splits_transaction on public.transaction_splits(transaction_id);

-- =============================================================
-- 7. transaction_tags
-- =============================================================
create table if not exists public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id         uuid not null references public.tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

-- Human-readable transaction list for selectors (e.g. split UI)
create or replace view public.transaction_options as
select
  t.id,
  t.date,
  t.type,
  t.amount,
  concat(
    to_char(t.date, 'YYYY-MM-DD'),
    ' | ',
    t.type,
    ' | ',
    to_char(t.amount, 'FM999,999,999,990.00'),
    ' | ',
    t.id
  ) as label
from public.transactions t
where t.deleted_at is null;

-- =============================================================
-- 8. budgets
-- =============================================================
create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid          not null references public.users(id) on delete cascade,
  category_id uuid          references public.categories(id) on delete set null,  -- null = total budget
  period      varchar(10)   not null check (period in ('daily','weekly','monthly','yearly')),
  amount      decimal(15,2) not null check (amount > 0),
  start_date  date          not null,
  end_date    date,
  created_at  timestamptz   not null default now()
);

create index if not exists idx_budgets_user_id       on public.budgets(user_id);
create index if not exists idx_budgets_user_period   on public.budgets(user_id, period);
create index if not exists idx_budgets_category_id   on public.budgets(category_id);

-- =============================================================
-- 9. goals
-- =============================================================
create table if not exists public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid          not null references public.users(id) on delete cascade,
  name           varchar(200)  not null,
  target_amount  decimal(15,2) not null check (target_amount > 0),
  current_amount decimal(15,2) not null default 0,
  target_date    date,
  icon           varchar(50),
  created_at     timestamptz   not null default now()
);

create index if not exists idx_goals_user_id on public.goals(user_id);

-- =============================================================
-- 10. goal_transactions
-- =============================================================
create table if not exists public.goal_transactions (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid          not null references public.goals(id) on delete cascade,
  amount      decimal(15,2) not null,  -- positive = deposit, negative = withdraw
  note        text,
  created_at  timestamptz   not null default now()
);

create index if not exists idx_goal_transactions_goal on public.goal_transactions(goal_id);

-- =============================================================
-- 11. debts
-- =============================================================
create table if not exists public.debts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid          not null references public.users(id) on delete cascade,
  type                varchar(10)   not null check (type in ('we_owe','they_owe')),
  counterparty        varchar(200)  not null,
  principal           decimal(15,2) not null check (principal > 0),
  interest_rate       decimal(5,2)  check (interest_rate >= 0),
  total_installments  int           check (total_installments > 0),
  due_date            date,
  note                text,
  created_at          timestamptz   not null default now()
);

create index if not exists idx_debts_user_id on public.debts(user_id);

-- =============================================================
-- 12. debt_schedules
-- =============================================================
create table if not exists public.debt_schedules (
  id              uuid primary key default gen_random_uuid(),
  debt_id         uuid          not null references public.debts(id) on delete cascade,
  installment_no  int           not null,
  due_date        date          not null,
  amount          decimal(15,2) not null,
  paid_amount     decimal(15,2) not null default 0,
  paid_at         timestamptz
);

create index if not exists idx_debt_schedules_debt_id on public.debt_schedules(debt_id);

-- =============================================================
-- 13. assets
-- =============================================================
create table if not exists public.assets (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid          not null references public.users(id) on delete cascade,
  name               varchar(200)  not null,
  type               varchar(20)   not null check (type in ('house','car','stock','fund','crypto','deposit')),
  current_value      decimal(15,2) not null default 0,
  purchase_price     decimal(15,2),
  purchase_date      date,
  depreciation_rate  decimal(5,2),
  note               text,
  created_at         timestamptz   not null default now()
);

create index if not exists idx_assets_user_id on public.assets(user_id);

-- =============================================================
-- 14. asset_valuations
-- =============================================================
create table if not exists public.asset_valuations (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid          not null references public.assets(id) on delete cascade,
  value       decimal(15,2) not null,
  recorded_at date          not null,
  note        text
);

create index if not exists idx_asset_valuations_asset on public.asset_valuations(asset_id, recorded_at desc);

-- =============================================================
-- 15. bills_subscriptions
-- =============================================================
create table if not exists public.bills_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid          not null references public.users(id) on delete cascade,
  name               varchar(200)  not null,
  type               varchar(15)   not null check (type in ('bill','subscription')),
  amount             decimal(15,2) not null check (amount > 0),
  due_day            int           not null check (due_day between 1 and 31),
  account_id         uuid          references public.accounts(id) on delete set null,
  category_id        uuid          references public.categories(id) on delete set null,
  remind_days_before int           not null default 3,
  is_active          boolean       not null default true
);

create index if not exists idx_bills_user_id    on public.bills_subscriptions(user_id);
create index if not exists idx_bills_user_active on public.bills_subscriptions(user_id, is_active);

-- =============================================================
-- 16. recurring_transactions
-- =============================================================
create table if not exists public.recurring_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid          not null references public.users(id) on delete cascade,
  type        varchar(10)   not null check (type in ('income','expense')),
  amount      decimal(15,2) not null check (amount > 0),
  account_id  uuid          not null references public.accounts(id) on delete restrict,
  category_id uuid          references public.categories(id) on delete set null,
  frequency   varchar(10)   not null check (frequency in ('daily','weekly','monthly','yearly')),
  next_date   date          not null,
  end_date    date,
  is_active   boolean       not null default true,
  note        text
);

create index if not exists idx_recurring_user_id on public.recurring_transactions(user_id);

-- =============================================================
-- 17. notifications
-- =============================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid          not null references public.users(id) on delete cascade,
  type        varchar(30)   not null check (type in ('bill_due','budget_exceeded','goal_reached','debt_due')),
  title       varchar(200)  not null,
  body        text          not null,
  is_read     boolean       not null default false,
  sent_via    varchar(10)   not null default 'push' check (sent_via in ('push','email','line')),
  created_at  timestamptz   not null default now()
);

create index if not exists idx_notifications_user_id    on public.notifications(user_id);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read) where is_read = false;

-- =============================================================
-- 18. audit_logs
-- =============================================================
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid          not null references public.users(id) on delete cascade,
  entity_type varchar(50)   not null,
  entity_id   uuid          not null,
  action      varchar(10)   not null check (action in ('create','update','delete')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz   not null default now()
);

create index if not exists idx_audit_user_id     on public.audit_logs(user_id);
create index if not exists idx_audit_entity      on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_created_at  on public.audit_logs(created_at desc);

-- =============================================================
-- 19. couples  (Phase 3 — Couple Mode)
-- =============================================================
create table if not exists public.couples (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(100),
  created_at  timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id   uuid not null references public.couples(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  role        varchar(10) not null default 'member' check (role in ('owner','member')),
  permission  varchar(10) not null default 'view'   check (permission in ('view','edit')),
  primary key (couple_id, user_id)
);

create table if not exists public.relationship_invites (
  id            uuid primary key default gen_random_uuid(),
  from_user_id  uuid          not null references public.users(id) on delete cascade,
  to_email      varchar(255),
  couple_id     uuid          references public.couples(id) on delete cascade,
  status        varchar(10)   not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at    timestamptz   not null default now()
);

-- =============================================================
-- Row Level Security (RLS)
-- =============================================================
-- Enable RLS on all user-owned tables
alter table public.users               enable row level security;
alter table public.auth_providers      enable row level security;
alter table public.accounts            enable row level security;
alter table public.categories          enable row level security;
alter table public.tags                enable row level security;
alter table public.transactions        enable row level security;
alter table public.transaction_splits  enable row level security;
alter table public.transaction_tags    enable row level security;
alter table public.budgets             enable row level security;
alter table public.goals               enable row level security;
alter table public.goal_transactions   enable row level security;
alter table public.debts               enable row level security;
alter table public.debt_schedules      enable row level security;
alter table public.assets              enable row level security;
alter table public.asset_valuations    enable row level security;
alter table public.bills_subscriptions enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.notifications       enable row level security;
alter table public.audit_logs          enable row level security;

-- users: own row only
create policy "users_own" on public.users
  using (id = auth.uid());

-- auth_providers
create policy "auth_providers_own" on public.auth_providers
  using (user_id = auth.uid());

-- accounts
create policy "accounts_own" on public.accounts
  using (user_id = auth.uid());

-- categories: own categories + preset categories (user_id is null)
create policy "categories_own_or_preset" on public.categories
  using (user_id = auth.uid() or user_id is null);

-- tags
create policy "tags_own" on public.tags
  using (user_id = auth.uid());

-- transactions
create policy "transactions_own" on public.transactions
  using (user_id = auth.uid());

-- transaction_splits  (via join to transactions)
create policy "transaction_splits_own" on public.transaction_splits
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_splits.transaction_id
        and t.user_id = auth.uid()
    )
  );

-- transaction_tags
create policy "transaction_tags_own" on public.transaction_tags
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_tags.transaction_id
        and t.user_id = auth.uid()
    )
  );

-- budgets
create policy "budgets_own" on public.budgets
  using (user_id = auth.uid());

-- goals
create policy "goals_own" on public.goals
  using (user_id = auth.uid());

-- goal_transactions
create policy "goal_transactions_own" on public.goal_transactions
  using (
    exists (
      select 1 from public.goals g
      where g.id = goal_transactions.goal_id
        and g.user_id = auth.uid()
    )
  );

-- debts
create policy "debts_own" on public.debts
  using (user_id = auth.uid());

-- debt_schedules
create policy "debt_schedules_own" on public.debt_schedules
  using (
    exists (
      select 1 from public.debts d
      where d.id = debt_schedules.debt_id
        and d.user_id = auth.uid()
    )
  );

-- assets
create policy "assets_own" on public.assets
  using (user_id = auth.uid());

-- asset_valuations
create policy "asset_valuations_own" on public.asset_valuations
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_valuations.asset_id
        and a.user_id = auth.uid()
    )
  );

-- bills_subscriptions
create policy "bills_own" on public.bills_subscriptions
  using (user_id = auth.uid());

-- recurring_transactions
create policy "recurring_own" on public.recurring_transactions
  using (user_id = auth.uid());

-- notifications
create policy "notifications_own" on public.notifications
  using (user_id = auth.uid());

-- audit_logs
create policy "audit_own" on public.audit_logs
  using (user_id = auth.uid());

-- =============================================================
-- Preset Category Seed Data
-- (Run after schema, or use scripts/seed-preset-categories.mjs)
-- =============================================================
insert into public.categories (name, type, is_preset, color, sort_order) values
  -- Income
  ('เงินเดือน',         'income',  true, '#34d399', 10),
  ('รายได้อื่น',        'income',  true, '#60a5fa', 20),
  ('เงินปันผล',         'income',  true, '#fbbf24', 30),
  ('ขายของ',            'income',  true, '#a78bfa', 40),
  -- Expense
  ('อาหารและเครื่องดื่ม', 'expense', true, '#f87171', 10),
  ('ค่าเดินทาง',        'expense', true, '#38bdf8', 20),
  ('ค่าที่พัก',         'expense', true, '#f97316', 30),
  ('ค่าสาธารณูปโภค',    'expense', true, '#fbbf24', 40),
  ('ช้อปปิ้ง',          'expense', true, '#a855f7', 50),
  ('สุขภาพและความงาม',  'expense', true, '#14b8a6', 60),
  ('บันเทิง',           'expense', true, '#fb7185', 70),
  ('การศึกษา',          'expense', true, '#7c3aed', 80),
  ('ของขวัญและบริจาค',  'expense', true, '#f59e0b', 90),
  ('อื่นๆ',             'expense', true, '#64748b', 100)
on conflict do nothing;
