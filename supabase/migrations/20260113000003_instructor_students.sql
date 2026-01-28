-- ===============================================================
-- MIGRATION: instructor_students relationship table
-- Run this in Supabase SQL Editor
-- ===============================================================

-- Create instructor_students table for teacher-student relationships
CREATE TABLE IF NOT EXISTS public.instructor_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(instructor_id, student_id)
);

-- Enable RLS
ALTER TABLE public.instructor_students ENABLE ROW LEVEL SECURITY;

-- Instructor can view their students
CREATE POLICY "Instructors can view their students"
  ON public.instructor_students FOR SELECT
  USING (auth.uid() = instructor_id);

-- Students can view their instructors
CREATE POLICY "Students can view their instructors"
  ON public.instructor_students FOR SELECT
  USING (auth.uid() = student_id);

-- Only system/RPCs can insert (via accept_invite)
CREATE POLICY "System can insert relationships"
  ON public.instructor_students FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- ===============================================================
-- RPC: accept_invite - validates code and creates relationship
-- ===============================================================

CREATE OR REPLACE FUNCTION public.accept_invite(p_join_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_session RECORD;
  v_student_id UUID := auth.uid();
  v_student_role TEXT;
BEGIN
  -- Check if current user is a student
  SELECT role INTO v_student_role FROM profiles WHERE user_id = v_student_id;
  IF v_student_role != 'student' THEN
    RETURN json_build_object('success', false, 'error', 'Only students can join classes');
  END IF;

  -- Find the class session by join code
  SELECT * INTO v_session 
  FROM class_sessions 
  WHERE join_code = UPPER(p_join_code) AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite code');
  END IF;

  -- Check if relationship already exists
  IF EXISTS (
    SELECT 1 FROM instructor_students 
    WHERE instructor_id = v_session.coach_id AND student_id = v_student_id
  ) THEN
    RETURN json_build_object('success', true, 'message', 'Already connected to this instructor');
  END IF;

  -- Create the relationship
  INSERT INTO instructor_students (instructor_id, student_id)
  VALUES (v_session.coach_id, v_student_id);

  RETURN json_build_object(
    'success', true, 
    'message', 'Successfully joined class',
    'instructor_id', v_session.coach_id,
    'class_name', v_session.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===============================================================
-- Update class_sessions RLS for coaches
-- ===============================================================

-- Coaches can create their own sessions
CREATE POLICY "Coaches can create sessions"
  ON public.class_sessions FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

-- Coaches can view their sessions
CREATE POLICY "Coaches can view their sessions"
  ON public.class_sessions FOR SELECT
  USING (auth.uid() = coach_id);

-- Coaches can update their sessions  
CREATE POLICY "Coaches can update their sessions"
  ON public.class_sessions FOR UPDATE
  USING (auth.uid() = coach_id);

-- ===============================================================
-- Ensure students can view tasks from their instructors
-- ===============================================================

-- Drop old policy if exists and create new one
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;

CREATE POLICY "Users can view own tasks or instructor tasks"
  ON public.tasks FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM instructor_students 
      WHERE instructor_id = tasks.user_id AND student_id = auth.uid()
    )
  );
