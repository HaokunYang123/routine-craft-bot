-- Analytics foundation: admin profile flag, append-only activity events, and admin-only access

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_admin IS
  'Admin flag for analytics dashboard access. Set manually via SQL.';

CREATE OR REPLACE FUNCTION public.protect_profiles_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' AND NEW.is_admin IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'is_admin cannot be set via the client API';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'is_admin cannot be changed via the client API';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profiles_is_admin_trigger ON public.profiles;
CREATE TRIGGER protect_profiles_is_admin_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profiles_is_admin();

CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.activity_events IS
  'Append-only analytics event log for coach activity that is not already captured elsewhere.';

COMMENT ON COLUMN public.activity_events.metadata IS
  'Minimal event context for analytics aggregation (for example group_id or template_id).';

CREATE INDEX IF NOT EXISTS idx_activity_events_user_created_at
  ON public.activity_events (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_activity_events_event_type_created_at
  ON public.activity_events (event_type, created_at);

DROP POLICY IF EXISTS "Users can insert own activity events" ON public.activity_events;
CREATE POLICY "Users can insert own activity events"
  ON public.activity_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view activity events" ON public.activity_events;
CREATE POLICY "Admins can view activity events"
  ON public.activity_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = (select auth.uid())
        AND p.is_admin = true
    )
  );

CREATE OR REPLACE FUNCTION public.log_activity_event(
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'Event type parameter is required';
  END IF;

  INSERT INTO public.activity_events (user_id, event_type, metadata)
  VALUES (
    v_user_id,
    trim(p_event_type),
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity_event(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_activity_event(text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_activity_event(text, jsonb) TO authenticated;
