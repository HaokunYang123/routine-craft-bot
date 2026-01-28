-- Migration: Add stickers, user_stickers, and student_logs tables
-- For gamification (sticker rewards) and wellness tracking features

-- ============================================
-- STICKERS TABLE (available sticker collection)
-- ============================================
CREATE TABLE public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

-- Everyone can view stickers (they're like a catalog)
CREATE POLICY "Anyone can view stickers" 
  ON public.stickers FOR SELECT 
  USING (true);

-- ============================================
-- USER_STICKERS TABLE (earned stickers per user)
-- ============================================
CREATE TABLE public.user_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sticker_id UUID REFERENCES public.stickers(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;

-- Users can view their own stickers
CREATE POLICY "Users can view their own stickers" 
  ON public.user_stickers FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can earn stickers (insert)
CREATE POLICY "Users can earn stickers" 
  ON public.user_stickers FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STUDENT_LOGS TABLE (daily wellness check-ins)
-- ============================================
CREATE TABLE public.student_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('great', 'okay', 'tired', 'sore')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Only one log per user per day
  CONSTRAINT unique_user_log_per_day UNIQUE (user_id, log_date)
);

-- Enable RLS
ALTER TABLE public.student_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view their own logs" 
  ON public.student_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create their own logs
CREATE POLICY "Users can create their own logs" 
  ON public.student_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own logs (for same-day edits)
CREATE POLICY "Users can update their own logs" 
  ON public.student_logs FOR UPDATE 
  USING (auth.uid() = user_id);

-- ============================================
-- SEED DATA: Initial sticker collection
-- ============================================
INSERT INTO public.stickers (name, image_url, rarity) VALUES
  ('Gold Star', '/stickers/gold-star.svg', 'common'),
  ('Lightning Bolt', '/stickers/lightning-bolt.svg', 'common'),
  ('Rainbow', '/stickers/rainbow.svg', 'common'),
  ('Fire', '/stickers/fire.svg', 'rare'),
  ('Trophy', '/stickers/trophy.svg', 'rare'),
  ('Rocket', '/stickers/rocket.svg', 'rare'),
  ('Crown', '/stickers/crown.svg', 'epic'),
  ('Diamond', '/stickers/diamond.svg', 'epic'),
  ('Unicorn', '/stickers/unicorn.svg', 'legendary');

-- ============================================
-- ADD ROLE TO PROFILES (coach vs student)
-- ============================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('coach', 'student'));
