-- Parent dashboard RLS policies (read-only visibility + link/unlink writes)
-- Defensive: only creates policies when missing.

ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_instances'
      AND policyname = 'Parents can select linked child task instances'
  ) THEN
    CREATE POLICY "Parents can select linked child task instances"
      ON public.task_instances
      FOR SELECT
      USING (
        task_instances.assignee_id IN (
          SELECT pc.child_id
          FROM public.parent_children pc
          WHERE pc.parent_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notes'
      AND policyname = 'Parents can select child and group notes'
  ) THEN
    CREATE POLICY "Parents can select child and group notes"
      ON public.notes
      FOR SELECT
      USING (
        notes.to_user_id IN (
          SELECT pc.child_id
          FROM public.parent_children pc
          WHERE pc.parent_id = auth.uid()
        )
        OR (
          notes.group_id IN (
            SELECT gm.group_id
            FROM public.group_members gm
            WHERE gm.user_id IN (
              SELECT pc.child_id
              FROM public.parent_children pc
              WHERE pc.parent_id = auth.uid()
            )
          )
          AND notes.to_user_id IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Parents can select linked child profiles'
  ) THEN
    CREATE POLICY "Parents can select linked child profiles"
      ON public.profiles
      FOR SELECT
      USING (
        profiles.user_id IN (
          SELECT pc.child_id
          FROM public.parent_children pc
          WHERE pc.parent_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parent_links'
      AND policyname = 'Parents can select parent links for code lookup'
  ) THEN
    CREATE POLICY "Parents can select parent links for code lookup"
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
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parent_children'
      AND policyname = 'Parents can select own parent-child links (strict)'
  ) THEN
    CREATE POLICY "Parents can select own parent-child links (strict)"
      ON public.parent_children
      FOR SELECT
      USING (
        parent_children.parent_id = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parent_children'
      AND policyname = 'Parents can insert own parent-child links (strict)'
  ) THEN
    CREATE POLICY "Parents can insert own parent-child links (strict)"
      ON public.parent_children
      FOR INSERT
      WITH CHECK (
        parent_children.parent_id = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parent_children'
      AND policyname = 'Parents can delete own parent-child links'
  ) THEN
    CREATE POLICY "Parents can delete own parent-child links"
      ON public.parent_children
      FOR DELETE
      USING (
        parent_children.parent_id = auth.uid()
      );
  END IF;
END $$;
