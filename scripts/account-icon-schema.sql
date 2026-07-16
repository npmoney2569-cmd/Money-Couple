-- Add icon support to accounts
DROP VIEW IF EXISTS public.accounts_with_username;

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS bank_preset TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Update the view to include the new columns
-- security_invoker = true → ให้ view ใช้ RLS ของ user ที่เรียก (ไม่ใช่ owner)
CREATE VIEW public.accounts_with_username
WITH (security_invoker = true)
AS
SELECT 
    a.*,
    u.display_name AS username
FROM public.accounts a
LEFT JOIN public.users u ON a.user_id = u.id;

-- Grant access to the view
GRANT SELECT ON public.accounts_with_username TO authenticated, service_role;
