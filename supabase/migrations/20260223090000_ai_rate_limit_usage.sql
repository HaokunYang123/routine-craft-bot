-- AI rate limiting + usage telemetry for ai-chat

CREATE TABLE IF NOT EXISTS public.ai_rate_buckets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, action, window_start)
);

ALTER TABLE public.ai_rate_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rate buckets" ON public.ai_rate_buckets;
CREATE POLICY "Users can view own rate buckets"
  ON public.ai_rate_buckets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.ai_rate_buckets IS 'Atomic rate limit counters per user/action/hour window';

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  tokens_in integer,
  tokens_out integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage log" ON public.ai_usage_log;
CREATE POLICY "Users can view own usage log"
  ON public.ai_usage_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_created ON public.ai_usage_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_action_created ON public.ai_usage_log (action, created_at DESC);

COMMENT ON TABLE public.ai_usage_log IS 'AI feature usage telemetry. No prompt content stored. 90-day retention.';

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(p_action text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_action text;
  v_window timestamptz;
  v_count integer;
  v_max integer;
  v_allowed boolean;
  v_remaining integer;
  v_retry_after integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.role
  INTO v_role
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  IF v_role IS NULL OR v_role <> 'coach' THEN
    RAISE EXCEPTION 'AI features are restricted to coaches';
  END IF;

  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RAISE EXCEPTION 'Action parameter is required';
  END IF;

  v_action := trim(p_action);

  v_max := CASE v_action
    WHEN 'generate_plan' THEN 5
    WHEN 'personalize' THEN 10
    WHEN 'weekly_summary' THEN 5
    WHEN 'polish' THEN 20
    WHEN 'student_recap' THEN 10
    ELSE 30
  END;

  v_window := date_trunc('hour', now());

  INSERT INTO public.ai_rate_buckets (user_id, action, window_start, request_count)
  VALUES (v_user_id, v_action, v_window, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE
  SET request_count = public.ai_rate_buckets.request_count + 1
  RETURNING request_count INTO v_count;

  v_allowed := v_count <= v_max;
  v_remaining := GREATEST(v_max - v_count, 0);

  IF NOT v_allowed THEN
    v_retry_after := EXTRACT(EPOCH FROM (v_window + interval '1 hour' - now()))::integer;
  ELSE
    v_retry_after := 0;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'retry_after_seconds', v_retry_after,
    'limit', v_max,
    'used', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_rate_limit(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_ai_rate_limit(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_ai_usage(
  p_action text,
  p_tokens_in integer DEFAULT NULL,
  p_tokens_out integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.role
  INTO v_role
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  IF v_role IS NULL OR v_role <> 'coach' THEN
    RAISE EXCEPTION 'AI features are restricted to coaches';
  END IF;

  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RAISE EXCEPTION 'Action parameter is required';
  END IF;

  INSERT INTO public.ai_usage_log (user_id, action, tokens_in, tokens_out)
  VALUES (v_user_id, trim(p_action), p_tokens_in, p_tokens_out);
END;
$$;

REVOKE ALL ON FUNCTION public.log_ai_usage(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_ai_usage(text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_ai_usage(text, integer, integer) TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'run_rls_tests'
      AND pg_get_function_identity_arguments(p.oid) = ''
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'run_rls_tests_base'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    ALTER FUNCTION public.run_rls_tests() RENAME TO run_rls_tests_base;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.run_rls_tests()
RETURNS TABLE(test_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rows integer;
  v_rate jsonb;
  v_allowed boolean;
  v_action text;
  v_has_base boolean;
  v_coach_a uuid := '47f98af9-68c4-49c6-a034-2064694daaca'::uuid;
  v_student_a uuid := '7a25bc24-1867-4678-a6b7-1b94cb6683a5'::uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'run_rls_tests_base'
      AND pg_get_function_identity_arguments(p.oid) = ''
  )
  INTO v_has_base;

  IF v_has_base THEN
    RETURN QUERY
    SELECT t.test_name, t.passed, t.detail
    FROM public.run_rls_tests_base() AS t
    WHERE t.test_name <> 'structural_policy_count_77';
  ELSE
    RETURN QUERY
    SELECT
      'run_rls_tests_base_exists'::text,
      false,
      'run_rls_tests_base() missing; baseline tests not executed'::text;
  END IF;

  SELECT COUNT(*) INTO v_rows
  FROM pg_policies
  WHERE schemaname = 'public';

  RETURN QUERY
  SELECT
    'structural_policy_count_79'::text,
    (v_rows = 79),
    format('got %s policies, expected 79', v_rows)::text;

  SELECT COUNT(*) INTO v_rows
  FROM information_schema.routine_privileges r
  WHERE r.routine_schema = 'public'
    AND r.routine_name = 'check_ai_rate_limit'
    AND r.grantee IN ('PUBLIC', 'anon');

  RETURN QUERY
  SELECT
    'check_ai_rate_limit_no_public_or_anon_grants'::text,
    (v_rows = 0),
    format('got %s grants, expected 0', v_rows)::text;

  BEGIN
    v_action := 'rls_test_' || floor(EXTRACT(epoch FROM clock_timestamp()))::text;
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_coach_a), true);
    SELECT public.check_ai_rate_limit(v_action) INTO v_rate;
    v_allowed := COALESCE((v_rate->>'allowed')::boolean, false);

    RETURN QUERY
    SELECT
      'coach_can_call_check_ai_rate_limit'::text,
      v_allowed,
      COALESCE(v_rate::text, 'null')::text;

    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claims', '', true);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE 'RESET ROLE';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN QUERY
    SELECT
      'coach_can_call_check_ai_rate_limit'::text,
      false,
      SQLERRM::text;
  END;

  BEGIN
    v_action := 'rls_test_' || floor(EXTRACT(epoch FROM clock_timestamp()))::text;
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_student_a), true);

    BEGIN
      SELECT public.check_ai_rate_limit(v_action) INTO v_rate;
      RETURN QUERY
      SELECT
        'student_cannot_call_check_ai_rate_limit'::text,
        false,
        'expected exception but function call succeeded'::text;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY
      SELECT
        'student_cannot_call_check_ai_rate_limit'::text,
        true,
        SQLERRM::text;
    END;

    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claims', '', true);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE 'RESET ROLE';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN QUERY
    SELECT
      'student_cannot_call_check_ai_rate_limit'::text,
      false,
      SQLERRM::text;
  END;

  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_coach_a), true);
    SELECT COUNT(*) INTO v_rows
    FROM public.ai_rate_buckets
    WHERE user_id <> v_coach_a;

    RETURN QUERY
    SELECT
      'coach_can_view_own_ai_rate_buckets_only'::text,
      (v_rows = 0),
      format('rows visible for other users=%s, expected 0', v_rows)::text;

    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claims', '', true);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE 'RESET ROLE';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN QUERY
    SELECT
      'coach_can_view_own_ai_rate_buckets_only'::text,
      false,
      SQLERRM::text;
  END;

  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_student_a), true);
    SELECT COUNT(*) INTO v_rows
    FROM public.ai_rate_buckets;

    RETURN QUERY
    SELECT
      'student_cannot_view_ai_rate_buckets'::text,
      (v_rows = 0),
      format('got %s rows, expected 0', v_rows)::text;

    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claims', '', true);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE 'RESET ROLE';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN QUERY
    SELECT
      'student_cannot_view_ai_rate_buckets'::text,
      false,
      SQLERRM::text;
  END;

  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_coach_a), true);
    SELECT COUNT(*) INTO v_rows
    FROM public.ai_usage_log
    WHERE user_id <> v_coach_a;

    RETURN QUERY
    SELECT
      'coach_can_view_own_ai_usage_log_only'::text,
      (v_rows = 0),
      format('rows visible for other users=%s, expected 0', v_rows)::text;

    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claims', '', true);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE 'RESET ROLE';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN QUERY
    SELECT
      'coach_can_view_own_ai_usage_log_only'::text,
      false,
      SQLERRM::text;
  END;

  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_student_a), true);
    SELECT COUNT(*) INTO v_rows
    FROM public.ai_usage_log;

    RETURN QUERY
    SELECT
      'student_cannot_view_ai_usage_log'::text,
      (v_rows = 0),
      format('got %s rows, expected 0', v_rows)::text;

    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claims', '', true);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE 'RESET ROLE';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN QUERY
    SELECT
      'student_cannot_view_ai_usage_log'::text,
      false,
      SQLERRM::text;
  END;
END;
$$;

ALTER FUNCTION public.run_rls_tests() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.run_rls_tests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_rls_tests() FROM anon;
GRANT EXECUTE ON FUNCTION public.run_rls_tests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_rls_tests() TO service_role;
