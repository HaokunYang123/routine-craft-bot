CREATE OR REPLACE FUNCTION public.admin_ai_usage_by_action()
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
  GROUP BY 1
  ORDER BY 2 DESC, 1 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ai_usage_by_action() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ai_usage_by_action() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage_by_action() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_template_creation_trend()
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
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_template_creation_trend() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_template_creation_trend() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_template_creation_trend() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_avg_groups_per_coach()
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
  WHERE p.role = 'coach';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_avg_groups_per_coach() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_avg_groups_per_coach() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_avg_groups_per_coach() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_most_active_coaches(p_limit integer DEFAULT 10)
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
    GROUP BY 1
  ),
  group_counts AS (
    SELECT
      groups.coach_id AS user_id,
      COUNT(*)::bigint AS groups_created
    FROM groups
    GROUP BY 1
  ),
  ai_counts AS (
    SELECT
      ai_usage_log.user_id,
      COUNT(*)::bigint AS ai_calls
    FROM ai_usage_log
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

REVOKE ALL ON FUNCTION public.admin_most_active_coaches(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_most_active_coaches(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_most_active_coaches(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_platform_completion_rate()
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
  FROM task_instances;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_platform_completion_rate() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_platform_completion_rate() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_completion_rate() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_completion_by_group()
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
  GROUP BY 1, 2
  ORDER BY completion_rate DESC, total_tasks DESC, group_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_completion_by_group() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_completion_by_group() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_completion_by_group() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_top_groups(p_limit integer DEFAULT 5)
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
  GROUP BY 1, 2
  HAVING COUNT(*) >= 5
  ORDER BY completion_rate DESC, total_tasks DESC, group_name ASC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_top_groups(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_top_groups(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_top_groups(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_at_risk_students()
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
  WHERE ti.created_at >= now() - interval '14 days'
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

REVOKE ALL ON FUNCTION public.admin_at_risk_students() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_at_risk_students() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_at_risk_students() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_completion_trend()
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
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_completion_trend() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_completion_trend() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_completion_trend() TO authenticated;
