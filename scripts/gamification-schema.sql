-- Gamification Schema

CREATE TABLE IF NOT EXISTS public.gamification_stats (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_transaction_date DATE,
    health_score INT NOT NULL DEFAULT 50,
    points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.gamification_stats ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gamification_stats' AND policyname = 'Users can view their own gamification stats'
  ) THEN
    CREATE POLICY "Users can view their own gamification stats" ON public.gamification_stats FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can update their own gamification stats" ON public.gamification_stats FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own gamification stats" ON public.gamification_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'Users can view their own badges'
  ) THEN
    CREATE POLICY "Users can view their own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Insert default badges
INSERT INTO public.badges (id, name, description, icon) VALUES 
('11111111-1111-1111-1111-111111111111', 'Beginner Tracker', 'Recorded your first transaction.', '🎯'),
('22222222-2222-2222-2222-222222222222', '7-Day Streak', 'Recorded transactions for 7 consecutive days.', '🔥'),
('33333333-3333-3333-3333-333333333333', 'Budget Master', 'Stayed under budget for the month.', '👑')
ON CONFLICT (id) DO NOTHING;

-- Create function to update streak when a transaction is added
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
    today DATE := CURRENT_DATE;
    g_stats public.gamification_stats%ROWTYPE;
BEGIN
    -- Only process new transactions that are not soft-deleted
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Get or create stats record
    SELECT * INTO g_stats FROM public.gamification_stats WHERE user_id = NEW.user_id FOR UPDATE;
    
    IF NOT FOUND THEN
        INSERT INTO public.gamification_stats (user_id, current_streak, longest_streak, last_transaction_date, points)
        VALUES (NEW.user_id, 1, 1, NEW.date, 10)
        RETURNING * INTO g_stats;
        
        -- Award "Beginner Tracker" badge
        INSERT INTO public.user_badges (user_id, badge_id) 
        VALUES (NEW.user_id, '11111111-1111-1111-1111-111111111111') 
        ON CONFLICT DO NOTHING;
    ELSE
        -- Update streak logic
        IF g_stats.last_transaction_date IS NULL OR g_stats.last_transaction_date < NEW.date - INTERVAL '1 day' THEN
            -- Streak broken or first time
            UPDATE public.gamification_stats 
            SET current_streak = 1, 
                last_transaction_date = NEW.date,
                points = points + 10,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSIF g_stats.last_transaction_date = NEW.date - INTERVAL '1 day' THEN
            -- Streak continues
            UPDATE public.gamification_stats 
            SET current_streak = current_streak + 1,
                longest_streak = GREATEST(longest_streak, current_streak + 1),
                last_transaction_date = NEW.date,
                points = points + 10,
                updated_at = NOW()
            WHERE user_id = NEW.user_id
            RETURNING current_streak INTO g_stats.current_streak;

            -- Award 7-Day Streak badge if hit 7
            IF g_stats.current_streak = 7 THEN
                INSERT INTO public.user_badges (user_id, badge_id) 
                VALUES (NEW.user_id, '22222222-2222-2222-2222-222222222222') 
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
        -- If same day, do nothing to streak, but maybe add points? We won't add points to prevent spam.
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_user_streak ON public.transactions;
CREATE TRIGGER trigger_update_user_streak
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_streak();

-- Backfill existing users into gamification_stats
INSERT INTO public.gamification_stats (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;
