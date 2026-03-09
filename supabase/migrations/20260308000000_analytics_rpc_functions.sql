CREATE OR REPLACE FUNCTION public.admin_signup_curve(p_interval text DEFAULT 'week')
RETURNS TABLE(period timestamptz, signup_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interval text := lower(coalesce(p_interval, 'week'));
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  IF v_interval NOT IN ('week', 'month') THEN
    v_interval := 'week';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc(v_interval, u.created_at) AS period,
    COUNT(*)::bigint AS signup_count
  FROM auth.users u
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_signup_curve(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_signup_curve(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_signup_curve(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_active_users()
RETURNS TABLE(dau bigint, wau bigint, mau bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE last_sign_in_at >= now() - interval '1 day')::bigint AS dau,
    COUNT(*) FILTER (WHERE last_sign_in_at >= now() - interval '7 days')::bigint AS wau,
    COUNT(*) FILTER (WHERE last_sign_in_at >= now() - interval '30 days')::bigint AS mau
  FROM auth.users;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_active_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_active_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_active_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_role_distribution()
RETURNS TABLE(role text, user_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(p.role, 'unknown')::text AS role,
    COUNT(*)::bigint AS user_count
  FROM profiles p
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_role_distribution() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_role_distribution() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_role_distribution() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_churn_candidates()
RETURNS TABLE(user_id uuid, email text, last_sign_in timestamptz, days_inactive integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    u.email::text,
    u.last_sign_in_at AS last_sign_in,
    FLOOR(
      EXTRACT(
        EPOCH FROM (
          now() - COALESCE(u.last_sign_in_at, u.created_at)
        )
      ) / 86400
    )::integer AS days_inactive
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.role = 'coach'
    AND (
      u.last_sign_in_at < now() - interval '14 days'
      OR u.last_sign_in_at IS NULL
    )
  ORDER BY 4 DESC, 2 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_churn_candidates() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_churn_candidates() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_churn_candidates() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_ai_usage_trend()
RETURNS TABLE(period timestamptz, action text, usage_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('week', ai_usage_log.created_at) AS period,
    ai_usage_log.action::text,
    COUNT(*)::bigint AS usage_count
  FROM ai_usage_log
  GROUP BY 1, 2
  ORDER BY 1 ASC, 2 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ai_usage_trend() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ai_usage_trend() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage_trend() TO authenticated;
