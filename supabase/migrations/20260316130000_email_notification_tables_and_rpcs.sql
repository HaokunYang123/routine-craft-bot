-- Phase 1.3: WS-EMAIL-NOTIFY Backend
-- Note: owner_profile_id references profiles.user_id because auth.uid() matches
-- profiles.user_id in the live schema, not profiles.id.

CREATE TABLE public.notification_preferences (
  pref_row_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  notify_on_task_completion boolean NOT NULL DEFAULT false,
  notify_on_task_assignment boolean NOT NULL DEFAULT false,
  digest_frequency text NOT NULL DEFAULT 'immediate'
    CHECK (digest_frequency IN ('immediate', 'daily', 'off')),
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_profile_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notification_preferences FROM PUBLIC;
REVOKE ALL ON TABLE public.notification_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_preferences TO authenticated;

CREATE POLICY "Users read own notification prefs"
  ON public.notification_preferences
  FOR SELECT
  USING (owner_profile_id = auth.uid());

CREATE POLICY "Users write own notification prefs"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (owner_profile_id = auth.uid());

CREATE POLICY "Users update own notification prefs"
  ON public.notification_preferences
  FOR UPDATE
  USING (owner_profile_id = auth.uid())
  WITH CHECK (owner_profile_id = auth.uid());

CREATE INDEX idx_notif_prefs_owner
  ON public.notification_preferences (owner_profile_id);

CREATE TABLE public.notification_send_log (
  log_entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  related_instance_id uuid NOT NULL REFERENCES public.task_instances(id) ON DELETE CASCADE,
  trigger_event_type text NOT NULL,
  dispatched_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE public.notification_send_log FROM PUBLIC;
REVOKE ALL ON TABLE public.notification_send_log FROM anon;
REVOKE ALL ON TABLE public.notification_send_log FROM authenticated;

CREATE INDEX idx_notif_log_dedup
  ON public.notification_send_log (
    recipient_email,
    related_instance_id,
    trigger_event_type,
    dispatched_at
  );

CREATE OR REPLACE FUNCTION public.upsert_notification_prefs(
  p_completion_flag boolean DEFAULT false,
  p_assignment_flag boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_result public.notification_preferences%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.notification_preferences (
    owner_profile_id,
    notify_on_task_completion,
    notify_on_task_assignment
  ) VALUES (
    v_caller_id,
    p_completion_flag,
    p_assignment_flag
  )
  ON CONFLICT (owner_profile_id) DO UPDATE
  SET notify_on_task_completion = EXCLUDED.notify_on_task_completion,
      notify_on_task_assignment = EXCLUDED.notify_on_task_assignment,
      modified_at = now()
  RETURNING *
  INTO v_result;

  RETURN to_jsonb(v_result);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_notification_prefs(boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_notification_prefs(boolean, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_notification_prefs(boolean, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.fetch_notification_prefs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_prefs public.notification_preferences%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_prefs
  FROM public.notification_preferences
  WHERE owner_profile_id = v_caller_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'notify_on_task_completion', false,
      'notify_on_task_assignment', false,
      'digest_frequency', 'immediate'
    );
  END IF;

  RETURN to_jsonb(v_prefs);
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_notification_prefs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fetch_notification_prefs() FROM anon;
GRANT EXECUTE ON FUNCTION public.fetch_notification_prefs() TO authenticated;
