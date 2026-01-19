-- =====================================================
-- TeachCoachConnect RLS Policies - APPLY IN SUPABASE DASHBOARD
-- =====================================================
-- Go to: Supabase Dashboard > SQL Editor > New Query
-- Paste this entire file and click "Run"
-- =====================================================

-- PREREQUISITE: Add class_session_id to instructor_students if missing
-- This enables multi-group support (students can join multiple groups from same coach)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instructor_students' AND column_name = 'class_session_id'
  ) THEN
    ALTER TABLE public.instructor_students
    ADD COLUMN class_session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE;

    -- Drop old constraint and add new one with class_session_id
    ALTER TABLE public.instructor_students DROP CONSTRAINT IF EXISTS instructor_students_instructor_id_student_id_key;
    ALTER TABLE public.instructor_students
    ADD CONSTRAINT instructor_students_unique UNIQUE (instructor_id, student_id, class_session_id);
  END IF;
END $$;

-- Update accept_invite function to support multi-group join
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

  -- Check if already in THIS specific class
  IF EXISTS (
    SELECT 1 FROM instructor_students
    WHERE instructor_id = v_session.coach_id
      AND student_id = v_student_id
      AND class_session_id = v_session.id
  ) THEN
    RETURN json_build_object('success', true, 'message', 'Already in this class', 'class_name', v_session.name);
  END IF;

  -- Create the relationship with class_session_id
  INSERT INTO instructor_students (instructor_id, student_id, class_session_id)
  VALUES (v_session.coach_id, v_student_id, v_session.id);

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined class',
    'instructor_id', v_session.coach_id,
    'class_name', v_session.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1. CLASS_SESSIONS TABLE POLICIES
-- Enable RLS if not already enabled
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Coaches can view their sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Coaches can create sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Coaches can update their sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Coaches can delete their sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Students can view sessions they joined" ON public.class_sessions;

-- Create policies for class_sessions
CREATE POLICY "Coaches can view their sessions"
  ON public.class_sessions FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create sessions"
  ON public.class_sessions FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their sessions"
  ON public.class_sessions FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their sessions"
  ON public.class_sessions FOR DELETE
  USING (auth.uid() = coach_id);

-- Students can view sessions they're part of (for joining)
CREATE POLICY "Students can view sessions they joined"
  ON public.class_sessions FOR SELECT
  USING (
    id IN (
      SELECT class_session_id FROM public.instructor_students
      WHERE student_id = auth.uid()
    )
  );

-- Allow anyone to view sessions by join_code (for joining)
CREATE POLICY "Anyone can view session by join code"
  ON public.class_sessions FOR SELECT
  USING (true);


-- 2. INSTRUCTOR_STUDENTS TABLE POLICIES
ALTER TABLE public.instructor_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can view their students" ON public.instructor_students;
DROP POLICY IF EXISTS "Coaches can add students" ON public.instructor_students;
DROP POLICY IF EXISTS "Coaches can remove students" ON public.instructor_students;
DROP POLICY IF EXISTS "Students can view their connections" ON public.instructor_students;
DROP POLICY IF EXISTS "Students can join classes" ON public.instructor_students;
DROP POLICY IF EXISTS "Students can leave classes" ON public.instructor_students;

-- Coaches can view students in their classes
CREATE POLICY "Coaches can view their students"
  ON public.instructor_students FOR SELECT
  USING (instructor_id = auth.uid());

-- Coaches can add students
CREATE POLICY "Coaches can add students"
  ON public.instructor_students FOR INSERT
  WITH CHECK (instructor_id = auth.uid());

-- Coaches can remove students from their classes
CREATE POLICY "Coaches can remove students"
  ON public.instructor_students FOR DELETE
  USING (instructor_id = auth.uid());

-- Students can view their own connections
CREATE POLICY "Students can view their connections"
  ON public.instructor_students FOR SELECT
  USING (student_id = auth.uid());

-- Students can join classes (insert their own record)
CREATE POLICY "Students can join classes"
  ON public.instructor_students FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Students can leave classes (delete their own record)
CREATE POLICY "Students can leave classes"
  ON public.instructor_students FOR DELETE
  USING (student_id = auth.uid());


-- 3. TASKS TABLE POLICIES
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Students can view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Students can update assigned tasks" ON public.tasks;

-- Users can view tasks they created
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create tasks
CREATE POLICY "Users can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Students can view tasks assigned to them
CREATE POLICY "Students can view assigned tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = assigned_student_id);

-- Students can update tasks assigned to them (mark complete)
CREATE POLICY "Students can update assigned tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = assigned_student_id);


-- 4. PROFILES TABLE POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Anyone can view profiles (needed for display names)
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 5. TEMPLATES TABLE POLICIES (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'templates') THEN
    ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Coaches can view their templates" ON public.templates;
    DROP POLICY IF EXISTS "Coaches can create templates" ON public.templates;
    DROP POLICY IF EXISTS "Coaches can update their templates" ON public.templates;
    DROP POLICY IF EXISTS "Coaches can delete their templates" ON public.templates;

    CREATE POLICY "Coaches can view their templates"
      ON public.templates FOR SELECT
      USING (coach_id = auth.uid());

    CREATE POLICY "Coaches can create templates"
      ON public.templates FOR INSERT
      WITH CHECK (coach_id = auth.uid());

    CREATE POLICY "Coaches can update their templates"
      ON public.templates FOR UPDATE
      USING (coach_id = auth.uid());

    CREATE POLICY "Coaches can delete their templates"
      ON public.templates FOR DELETE
      USING (coach_id = auth.uid());
  END IF;
END $$;


-- 6. TEMPLATE_TASKS TABLE POLICIES (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'template_tasks') THEN
    ALTER TABLE public.template_tasks ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view template tasks" ON public.template_tasks;
    DROP POLICY IF EXISTS "Users can manage template tasks" ON public.template_tasks;

    CREATE POLICY "Users can view template tasks"
      ON public.template_tasks FOR SELECT
      USING (
        template_id IN (SELECT id FROM public.templates WHERE coach_id = auth.uid())
      );

    CREATE POLICY "Users can manage template tasks"
      ON public.template_tasks FOR ALL
      USING (
        template_id IN (SELECT id FROM public.templates WHERE coach_id = auth.uid())
      );
  END IF;
END $$;


-- =====================================================
-- VERIFICATION: Run this query to check policies
-- =====================================================
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';
