-- Migration: Add class_sessions and class_members tables
-- For QR code and class code authentication

-- ============================================
-- CLASS_SESSIONS TABLE (active classes)
-- ============================================
CREATE TABLE public.class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  -- 6-character alphanumeric code for manual entry
  join_code TEXT NOT NULL UNIQUE,
  -- QR token is different from join_code for security
  qr_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own sessions
CREATE POLICY "Coaches can view own sessions" 
  ON public.class_sessions FOR SELECT 
  USING (auth.uid() = coach_id);

-- Coaches can create sessions
CREATE POLICY "Coaches can create sessions" 
  ON public.class_sessions FOR INSERT 
  WITH CHECK (auth.uid() = coach_id);

-- Coaches can update their sessions
CREATE POLICY "Coaches can update own sessions" 
  ON public.class_sessions FOR UPDATE 
  USING (auth.uid() = coach_id);

-- Anyone can lookup sessions by join_code or qr_token (for joining)
CREATE POLICY "Anyone can lookup active sessions" 
  ON public.class_sessions FOR SELECT 
  USING (is_active = true);

-- ============================================
-- CLASS_MEMBERS TABLE (students in classes)
-- ============================================
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Prevent duplicate joins
  CONSTRAINT unique_class_member UNIQUE (class_session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Users can view classes they're in
CREATE POLICY "Users can view their memberships" 
  ON public.class_members FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can join classes
CREATE POLICY "Users can join classes" 
  ON public.class_members FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Coaches can view members of their classes
CREATE POLICY "Coaches can view class members" 
  ON public.class_members FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs 
      WHERE cs.id = class_session_id AND cs.coach_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTION: Generate random join code
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Validate QR token and return session
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_qr_token(token UUID)
RETURNS TABLE (
  session_id UUID,
  session_name TEXT,
  coach_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT cs.id, cs.name, cs.coach_id
  FROM public.class_sessions cs
  WHERE cs.qr_token = token
    AND cs.is_active = true
    AND (cs.expires_at IS NULL OR cs.expires_at > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Validate join code and return session
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_join_code(code TEXT)
RETURNS TABLE (
  session_id UUID,
  session_name TEXT,
  coach_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT cs.id, cs.name, cs.coach_id
  FROM public.class_sessions cs
  WHERE UPPER(cs.join_code) = UPPER(code)
    AND cs.is_active = true
    AND (cs.expires_at IS NULL OR cs.expires_at > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
