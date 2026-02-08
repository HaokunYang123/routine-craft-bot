-- Parent View Chunk 1
-- Database foundation for parent role and parent-child linking

-- 1) Expand profiles.role constraint to include parent, defensively.
DO $$
DECLARE
  role_check record;
BEGIN
  FOR role_check IN
    SELECT DISTINCT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'profiles'
      AND con.contype = 'c'
      AND att.attname = 'role'
      AND att.attnum = ANY(con.conkey)
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', role_check.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IS NULL OR role IN ('coach', 'student', 'parent'));

-- 2) parent_links table for one active code per student.
CREATE TABLE IF NOT EXISTS public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  link_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_links_link_code
  ON public.parent_links (link_code);

-- 3) parent_children table for established parent-child relationships.
CREATE TABLE IF NOT EXISTS public.parent_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'parent_children'
      AND con.conname = 'parent_children_parent_id_child_id_key'
  ) THEN
    ALTER TABLE public.parent_children
      ADD CONSTRAINT parent_children_parent_id_child_id_key UNIQUE (parent_id, child_id);
  END IF;
END $$;

-- 4) Code generation helpers and trigger.
CREATE OR REPLACE FUNCTION public.generate_parent_link_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  idx integer;
BEGIN
  FOR idx IN 1..6 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_parent_link_for_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_code text;
  attempt_count integer := 0;
BEGIN
  IF NEW.role IS DISTINCT FROM 'student' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.parent_links WHERE student_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  LOOP
    attempt_count := attempt_count + 1;
    IF attempt_count > 50 THEN
      RAISE EXCEPTION 'Unable to generate unique parent link code for student %', NEW.user_id;
    END IF;

    candidate_code := public.generate_parent_link_code();

    BEGIN
      INSERT INTO public.parent_links (student_id, link_code)
      VALUES (NEW.user_id, candidate_code);
      RETURN NEW;
    EXCEPTION
      WHEN unique_violation THEN
        -- Collision on link_code or concurrent insert for student_id, retry safely.
        IF EXISTS (SELECT 1 FROM public.parent_links WHERE student_id = NEW.user_id) THEN
          RETURN NEW;
        END IF;
    END;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS create_parent_link_for_student_trigger ON public.profiles;

CREATE TRIGGER create_parent_link_for_student_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.role = 'student')
EXECUTE FUNCTION public.create_parent_link_for_student();

-- 5) Backfill parent_links for existing student profiles missing links.
DO $$
DECLARE
  student_row record;
  candidate_code text;
  attempt_count integer;
BEGIN
  FOR student_row IN
    SELECT p.user_id
    FROM public.profiles p
    LEFT JOIN public.parent_links pl ON pl.student_id = p.user_id
    WHERE p.role = 'student'
      AND pl.student_id IS NULL
  LOOP
    attempt_count := 0;
    LOOP
      attempt_count := attempt_count + 1;
      IF attempt_count > 50 THEN
        RAISE EXCEPTION 'Unable to backfill parent link code for student %', student_row.user_id;
      END IF;

      candidate_code := public.generate_parent_link_code();

      BEGIN
        INSERT INTO public.parent_links (student_id, link_code)
        VALUES (student_row.user_id, candidate_code);
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          IF EXISTS (SELECT 1 FROM public.parent_links WHERE student_id = student_row.user_id) THEN
            EXIT;
          END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

-- 6) RLS and policies for parent_links and parent_children.
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own parent link" ON public.parent_links;
CREATE POLICY "Students can view own parent link"
  ON public.parent_links
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Parents can view all parent links" ON public.parent_links;
CREATE POLICY "Parents can view all parent links"
  ON public.parent_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'parent'
    )
  );

DROP POLICY IF EXISTS "Coaches can view parent links for own students" ON public.parent_links;
CREATE POLICY "Coaches can view parent links for own students"
  ON public.parent_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.groups g
      JOIN public.group_members gm ON gm.group_id = g.id
      WHERE g.coach_id = auth.uid()
        AND gm.user_id = parent_links.student_id
    )
  );

DROP POLICY IF EXISTS "Parents can view own parent-child links" ON public.parent_children;
CREATE POLICY "Parents can view own parent-child links"
  ON public.parent_children
  FOR SELECT
  USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "Parents can insert own parent-child links" ON public.parent_children;
CREATE POLICY "Parents can insert own parent-child links"
  ON public.parent_children
  FOR INSERT
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'parent'
    )
  );

DROP POLICY IF EXISTS "Students can view parent-child links where they are child" ON public.parent_children;
CREATE POLICY "Students can view parent-child links where they are child"
  ON public.parent_children
  FOR SELECT
  USING (child_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can view parent-child links for own students" ON public.parent_children;
CREATE POLICY "Coaches can view parent-child links for own students"
  ON public.parent_children
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.groups g
      JOIN public.group_members gm ON gm.group_id = g.id
      WHERE g.coach_id = auth.uid()
        AND gm.user_id = parent_children.child_id
    )
  );
