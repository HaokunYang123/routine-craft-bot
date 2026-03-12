CREATE OR REPLACE FUNCTION public.admin_retention_cohorts(p_weeks integer DEFAULT 8)
RETURNS TABLE(
  cohort_week timestamptz,
  cohort_size integer,
  week_offset integer,
  active_users integer,
  retention_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weeks integer := GREATEST(COALESCE(p_weeks, 8), 0);
  v_current_week timestamptz := date_trunc('week', now());
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH cohort_members AS (
    SELECT
      p.user_id,
      date_trunc('week', p.created_at) AS cohort_week
    FROM public.profiles p
    WHERE p.created_at < v_current_week
  ),
  cohort_sizes AS (
    SELECT
      cm.cohort_week,
      COUNT(*)::integer AS cohort_size
    FROM cohort_members cm
    GROUP BY 1
  ),
  activity_weeks AS (
    SELECT DISTINCT
      ae.user_id,
      date_trunc('week', ae.created_at) AS activity_week
    FROM public.activity_events ae

    UNION

    SELECT DISTINCT
      u.id AS user_id,
      date_trunc('week', u.last_sign_in_at) AS activity_week
    FROM auth.users u
    WHERE u.last_sign_in_at IS NOT NULL
  ),
  cohort_grid AS (
    SELECT
      cs.cohort_week,
      cs.cohort_size,
      gs.week_offset,
      cs.cohort_week + make_interval(weeks => gs.week_offset) AS activity_week
    FROM cohort_sizes cs
    CROSS JOIN generate_series(0, v_weeks) AS gs(week_offset)
    WHERE cs.cohort_week + make_interval(weeks => gs.week_offset) < v_current_week
  )
  SELECT
    cg.cohort_week,
    cg.cohort_size,
    cg.week_offset,
    CASE
      WHEN cg.week_offset = 0 THEN cg.cohort_size
      ELSE COUNT(DISTINCT aw.user_id)::integer
    END AS active_users,
    ROUND(
      (
        CASE
          WHEN cg.week_offset = 0 THEN cg.cohort_size::numeric
          ELSE COUNT(DISTINCT aw.user_id)::numeric
        END
        / NULLIF(cg.cohort_size, 0)
      ) * 100,
      1
    ) AS retention_pct
  FROM cohort_grid cg
  JOIN cohort_members cm
    ON cm.cohort_week = cg.cohort_week
  LEFT JOIN activity_weeks aw
    ON aw.user_id = cm.user_id
   AND aw.activity_week = cg.activity_week
  GROUP BY 1, 2, 3
  ORDER BY 1 DESC, 3 ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_retention_cohorts(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_retention_cohorts(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_retention_cohorts(integer) TO authenticated;
