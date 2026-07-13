-- Add icon support to accounts
DROP VIEW IF EXISTS public.accounts_with_username;

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS bank_preset TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Update the view to include the new columns
CREATE VIEW public.accounts_with_username AS
SELECT 
    a.*,
    u.display_name AS username
FROM public.accounts a
LEFT JOIN public.users u ON a.user_id = u.id;
