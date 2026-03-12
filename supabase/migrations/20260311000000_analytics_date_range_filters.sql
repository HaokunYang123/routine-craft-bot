DROP FUNCTION IF EXISTS public.admin_signup_curve(text);
CREATE OR REPLACE FUNCTION public.admin_signup_curve(
  p_interval text DEFAULT 'week',
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
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
    date_trunc(v_interval, p.created_at) AS period,
    COUNT(*)::bigint AS signup_count
  FROM profiles p
  WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at < p_end_date)
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_signup_curve(text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_signup_curve(text, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_signup_curve(text, timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_active_users();
CREATE OR REPLACE FUNCTION public.admin_active_users(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(dau bigint, wau bigint, mau bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_end timestamptz := coalesce(p_end_date, now());
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (
      WHERE u.last_sign_in_at >= v_window_end - interval '1 day'
        AND (p_start_date IS NULL OR u.last_sign_in_at >= p_start_date)
        AND (p_end_date IS NULL OR u.last_sign_in_at < p_end_date)
    )::bigint AS dau,
    COUNT(*) FILTER (
      WHERE u.last_sign_in_at >= v_window_end - interval '7 days'
        AND (p_start_date IS NULL OR u.last_sign_in_at >= p_start_date)
        AND (p_end_date IS NULL OR u.last_sign_in_at < p_end_date)
    )::bigint AS wau,
    COUNT(*) FILTER (
      WHERE u.last_sign_in_at >= v_window_end - interval '30 days'
        AND (p_start_date IS NULL OR u.last_sign_in_at >= p_start_date)
        AND (p_end_date IS NULL OR u.last_sign_in_at < p_end_date)
    )::bigint AS mau
  FROM auth.users u;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_active_users(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_active_users(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_active_users(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_role_distribution();
CREATE OR REPLACE FUNCTION public.admin_role_distribution(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
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
  WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at < p_end_date)
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_role_distribution(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_role_distribution(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_role_distribution(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_churn_candidates();
CREATE OR REPLACE FUNCTION public.admin_churn_candidates(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(user_id uuid, email text, last_sign_in timestamptz, days_inactive integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reference_end timestamptz := coalesce(p_end_date, now());
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
          v_reference_end - COALESCE(u.last_sign_in_at, u.created_at)
        )
      ) / 86400
    )::integer AS days_inactive
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.role = 'coach'
    AND (
      (
        p_start_date IS NULL
        AND p_end_date IS NULL
        AND (
          u.last_sign_in_at < now() - interval '14 days'
          OR u.last_sign_in_at IS NULL
        )
      )
      OR (
        (p_start_date IS NOT NULL OR p_end_date IS NOT NULL)
        AND COALESCE(u.last_sign_in_at, u.created_at) < COALESCE(
          p_start_date,
          v_reference_end - interval '14 days'
        )
        AND u.created_at < v_reference_end
      )
    )
  ORDER BY 4 DESC, 2 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_churn_candidates(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_churn_candidates(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_churn_candidates(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_ai_usage_trend();
CREATE OR REPLACE FUNCTION public.admin_ai_usage_trend(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
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
  WHERE (p_start_date IS NULL OR ai_usage_log.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ai_usage_log.created_at < p_end_date)
  GROUP BY 1, 2
  ORDER BY 1 ASC, 2 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ai_usage_trend(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ai_usage_trend(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage_trend(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_ai_usage_by_action();
CREATE OR REPLACE FUNCTION public.admin_ai_usage_by_action(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(action text, usage_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ai_usage_log.action::text AS action,
    COUNT(*)::bigint AS usage_count
  FROM ai_usage_log
  WHERE (p_start_date IS NULL OR ai_usage_log.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ai_usage_log.created_at < p_end_date)
  GROUP BY 1
  ORDER BY 2 DESC, 1 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ai_usage_by_action(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ai_usage_by_action(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage_by_action(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_template_creation_trend();
CREATE OR REPLACE FUNCTION public.admin_template_creation_trend(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(period timestamptz, template_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('week', templates.created_at) AS period,
    COUNT(*)::bigint AS template_count
  FROM templates
  WHERE (p_start_date IS NULL OR templates.created_at >= p_start_date)
    AND (p_end_date IS NULL OR templates.created_at < p_end_date)
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_template_creation_trend(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_template_creation_trend(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_template_creation_trend(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_avg_groups_per_coach();
CREATE OR REPLACE FUNCTION public.admin_avg_groups_per_coach(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(avg_groups numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(
      ROUND(
        COUNT(g.id)::numeric / NULLIF(COUNT(DISTINCT p.user_id), 0),
        1
      ),
      0
    ) AS avg_groups
  FROM profiles p
  LEFT JOIN groups g
    ON g.coach_id = p.user_id
   AND (p_start_date IS NULL OR g.created_at >= p_start_date)
   AND (p_end_date IS NULL OR g.created_at < p_end_date)
  WHERE p.role = 'coach';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_avg_groups_per_coach(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_avg_groups_per_coach(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_avg_groups_per_coach(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_most_active_coaches(integer);
CREATE OR REPLACE FUNCTION public.admin_most_active_coaches(
  p_limit integer DEFAULT 10,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  email text,
  templates_created bigint,
  groups_created bigint,
  ai_calls bigint,
  total_activity bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := GREATEST(COALESCE(p_limit, 10), 0);
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH template_counts AS (
    SELECT
      templates.coach_id AS user_id,
      COUNT(*)::bigint AS templates_created
    FROM templates
    WHERE (p_start_date IS NULL OR templates.created_at >= p_start_date)
      AND (p_end_date IS NULL OR templates.created_at < p_end_date)
    GROUP BY 1
  ),
  group_counts AS (
    SELECT
      groups.coach_id AS user_id,
      COUNT(*)::bigint AS groups_created
    FROM groups
    WHERE (p_start_date IS NULL OR groups.created_at >= p_start_date)
      AND (p_end_date IS NULL OR groups.created_at < p_end_date)
    GROUP BY 1
  ),
  ai_counts AS (
    SELECT
      ai_usage_log.user_id,
      COUNT(*)::bigint AS ai_calls
    FROM ai_usage_log
    WHERE (p_start_date IS NULL OR ai_usage_log.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ai_usage_log.created_at < p_end_date)
    GROUP BY 1
  )
  SELECT
    p.user_id,
    COALESCE(u.email::text, p.email, '') AS email,
    COALESCE(tc.templates_created, 0)::bigint AS templates_created,
    COALESCE(gc.groups_created, 0)::bigint AS groups_created,
    COALESCE(ac.ai_calls, 0)::bigint AS ai_calls,
    (
      COALESCE(tc.templates_created, 0)
      + COALESCE(gc.groups_created, 0)
      + COALESCE(ac.ai_calls, 0)
    )::bigint AS total_activity
  FROM profiles p
  JOIN auth.users u
    ON u.id = p.user_id
  LEFT JOIN template_counts tc
    ON tc.user_id = p.user_id
  LEFT JOIN group_counts gc
    ON gc.user_id = p.user_id
  LEFT JOIN ai_counts ac
    ON ac.user_id = p.user_id
  WHERE p.role = 'coach'
  ORDER BY total_activity DESC, email ASC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_most_active_coaches(integer, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_most_active_coaches(integer, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_most_active_coaches(integer, timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_platform_completion_rate();
CREATE OR REPLACE FUNCTION public.admin_platform_completion_rate(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(total_tasks bigint, completed_tasks bigint, completion_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_tasks,
    COUNT(*) FILTER (WHERE task_instances.status = 'completed')::bigint AS completed_tasks,
    COALESCE(
      ROUND(
        (
          COUNT(*) FILTER (WHERE task_instances.status = 'completed')::numeric
          / NULLIF(COUNT(*), 0)
        ) * 100,
        1
      ),
      0
    ) AS completion_rate
  FROM task_instances
  WHERE (p_start_date IS NULL OR task_instances.created_at >= p_start_date)
    AND (p_end_date IS NULL OR task_instances.created_at < p_end_date);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_platform_completion_rate(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_platform_completion_rate(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_completion_rate(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_completion_by_group();
CREATE OR REPLACE FUNCTION public.admin_completion_by_group(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  group_id uuid,
  group_name text,
  total_tasks bigint,
  completed_tasks bigint,
  completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    g.id AS group_id,
    g.name::text AS group_name,
    COUNT(*)::bigint AS total_tasks,
    COUNT(*) FILTER (WHERE ti.status = 'completed')::bigint AS completed_tasks,
    COALESCE(
      ROUND(
        (
          COUNT(*) FILTER (WHERE ti.status = 'completed')::numeric
          / NULLIF(COUNT(*), 0)
        ) * 100,
        1
      ),
      0
    ) AS completion_rate
  FROM task_instances ti
  JOIN assignments a
    ON a.id = ti.assignment_id
  JOIN group_members gm
    ON gm.group_id = a.group_id
   AND gm.user_id = ti.assignee_id
  JOIN groups g
    ON g.id = gm.group_id
  WHERE (p_start_date IS NULL OR ti.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ti.created_at < p_end_date)
  GROUP BY 1, 2
  ORDER BY completion_rate DESC, total_tasks DESC, group_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_completion_by_group(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_completion_by_group(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_completion_by_group(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_top_groups(integer);
CREATE OR REPLACE FUNCTION public.admin_top_groups(
  p_limit integer DEFAULT 5,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(group_id uuid, group_name text, completion_rate numeric, total_tasks bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := GREATEST(COALESCE(p_limit, 5), 0);
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    g.id AS group_id,
    g.name::text AS group_name,
    COALESCE(
      ROUND(
        (
          COUNT(*) FILTER (WHERE ti.status = 'completed')::numeric
          / NULLIF(COUNT(*), 0)
        ) * 100,
        1
      ),
      0
    ) AS completion_rate,
    COUNT(*)::bigint AS total_tasks
  FROM task_instances ti
  JOIN assignments a
    ON a.id = ti.assignment_id
  JOIN group_members gm
    ON gm.group_id = a.group_id
   AND gm.user_id = ti.assignee_id
  JOIN groups g
    ON g.id = gm.group_id
  WHERE (p_start_date IS NULL OR ti.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ti.created_at < p_end_date)
  GROUP BY 1, 2
  HAVING COUNT(*) >= 5
  ORDER BY completion_rate DESC, total_tasks DESC, group_name ASC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_top_groups(integer, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_top_groups(integer, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_top_groups(integer, timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_at_risk_students();
CREATE OR REPLACE FUNCTION public.admin_at_risk_students(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  email text,
  total_tasks bigint,
  completed_tasks bigint,
  completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    COALESCE(u.email::text, p.email, '') AS email,
    COUNT(*)::bigint AS total_tasks,
    COUNT(*) FILTER (WHERE ti.status = 'completed')::bigint AS completed_tasks,
    COALESCE(
      ROUND(
        (
          COUNT(*) FILTER (WHERE ti.status = 'completed')::numeric
          / NULLIF(COUNT(*), 0)
        ) * 100,
        1
      ),
      0
    ) AS completion_rate
  FROM task_instances ti
  JOIN profiles p
    ON p.user_id = ti.assignee_id
   AND p.role = 'student'
  JOIN auth.users u
    ON u.id = p.user_id
  WHERE (
    (
      p_start_date IS NULL
      AND p_end_date IS NULL
      AND ti.created_at >= now() - interval '14 days'
    )
    OR (
      (p_start_date IS NOT NULL OR p_end_date IS NOT NULL)
      AND (p_start_date IS NULL OR ti.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ti.created_at < p_end_date)
    )
  )
  GROUP BY 1, 2
  HAVING COALESCE(
    ROUND(
      (
        COUNT(*) FILTER (WHERE ti.status = 'completed')::numeric
        / NULLIF(COUNT(*), 0)
      ) * 100,
      1
    ),
    0
  ) < 50
  ORDER BY completion_rate ASC, total_tasks DESC, email ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_at_risk_students(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_at_risk_students(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_at_risk_students(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_completion_trend();
CREATE OR REPLACE FUNCTION public.admin_completion_trend(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  period timestamptz,
  total_tasks bigint,
  completed_tasks bigint,
  completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('week', task_instances.created_at) AS period,
    COUNT(*)::bigint AS total_tasks,
    COUNT(*) FILTER (WHERE task_instances.status = 'completed')::bigint AS completed_tasks,
    COALESCE(
      ROUND(
        (
          COUNT(*) FILTER (WHERE task_instances.status = 'completed')::numeric
          / NULLIF(COUNT(*), 0)
        ) * 100,
        1
      ),
      0
    ) AS completion_rate
  FROM task_instances
  WHERE (p_start_date IS NULL OR task_instances.created_at >= p_start_date)
    AND (p_end_date IS NULL OR task_instances.created_at < p_end_date)
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_completion_trend(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_completion_trend(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_completion_trend(timestamptz, timestamptz) TO authenticated;
