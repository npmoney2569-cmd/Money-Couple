-- =============================================================
-- Migration: Goals redesign with savings accounts
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. Add 'savings' to accounts.type constraint
-- Note: We have to drop and recreate the constraint
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check 
  CHECK (type IN ('cash','bank','credit_card','e_wallet','investment','savings'));

-- 2. Add account_id to goals
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS 
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 3. Remove not-null constraint and default from current_amount
ALTER TABLE public.goals ALTER COLUMN current_amount DROP NOT NULL;
ALTER TABLE public.goals ALTER COLUMN current_amount DROP DEFAULT;
