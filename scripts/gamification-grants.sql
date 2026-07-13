-- Grant permissions to authenticated and service roles

GRANT ALL ON TABLE public.gamification_stats TO authenticated;
GRANT ALL ON TABLE public.gamification_stats TO service_role;

GRANT ALL ON TABLE public.badges TO authenticated;
GRANT ALL ON TABLE public.badges TO service_role;

GRANT ALL ON TABLE public.user_badges TO authenticated;
GRANT ALL ON TABLE public.user_badges TO service_role;

-- We should also allow anon to read badges if needed, but authenticated is fine for now
GRANT SELECT ON TABLE public.badges TO anon;
GRANT SELECT ON TABLE public.badges TO authenticated;

-- Ensure badges table has RLS and policy just in case
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'badges' AND policyname = 'Anyone can view badges'
  ) THEN
    CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);
  END IF;
END $$;
