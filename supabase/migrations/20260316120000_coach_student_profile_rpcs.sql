-- Phase 1.2: WS-COACH-STUDENT-PROFILE Backend RPCs
-- Note: the live schema uses task_instances.assignee_id for the concrete student on each
-- task row, while assignments.assignee_id is nullable for group assignments.

CREATE OR REPLACE FUNCTION public.coach_fetch_student_task_list(
  p_target_student_id uuid,
  p_window_start date DEFAULT (CURRENT_DATE - 7),
  p_window_end date DEFAULT (CURRENT_DATE + 30)
) RETURNS TABLE (
  instance_id uuid,
  parent_task_title text,
  scheduled_date date,
  start_time time,
  end_time time,
  completion_status text,
  origin_group_id uuid,
  origin_group_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_student_link_exists boolean := false;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT p.role
  INTO v_caller_role
  FROM public.profiles p
  WHERE p.user_id = v_caller_id
  LIMIT 1;

  IF v_caller_role IS DISTINCT FROM 'coach' THEN
    RAISE EXCEPTION 'not_a_coach' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.instructor_students isr
    WHERE isr.instructor_id = v_caller_id
      AND isr.student_id = p_target_student_id
  )
  INTO v_student_link_exists;

  IF NOT v_student_link_exists THEN
    RAISE EXCEPTION 'student_not_linked' USING ERRCODE = 'P0001';
  END IF;

  IF p_window_start IS NULL OR p_window_end IS NULL OR p_window_start > p_window_end THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ti.id AS instance_id,
    ti.name AS parent_task_title,
    ti.scheduled_date,
    CASE
      WHEN nullif(btrim(ti.start_time), '') ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN nullif(btrim(ti.start_time), '')::time
      ELSE ti.scheduled_time
    END AS start_time,
    CASE
      WHEN nullif(btrim(ti.end_time), '') ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN nullif(btrim(ti.end_time), '')::time
      ELSE NULL
    END AS end_time,
    ti.status AS completion_status,
    a.group_id AS origin_group_id,
    g.name AS origin_group_name
  FROM public.task_instances ti
  JOIN public.assignments a
    ON a.id = ti.assignment_id
  LEFT JOIN public.groups g
    ON g.id = a.group_id
  WHERE ti.assignee_id = p_target_student_id
    AND ti.scheduled_date BETWEEN p_window_start AND p_window_end
    AND COALESCE(ti.coach_id, a.assigned_by) = v_caller_id
  ORDER BY
    ti.scheduled_date ASC,
    CASE
      WHEN nullif(btrim(ti.start_time), '') ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN nullif(btrim(ti.start_time), '')::time
      ELSE ti.scheduled_time
    END ASC NULLS LAST,
    ti.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.coach_fetch_student_task_list(uuid, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coach_fetch_student_task_list(uuid, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.coach_fetch_student_task_list(uuid, date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.coach_fetch_student_profile_summary(
  p_target_student_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_student_link_exists boolean := false;
  v_student_display_name text;
  v_student_email text;
  v_groups jsonb := '[]'::jsonb;
  v_total_assigned_count bigint := 0;
  v_total_completed_count bigint := 0;
  v_completion_pct numeric := 0.0;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT p.role
  INTO v_caller_role
  FROM public.profiles p
  WHERE p.user_id = v_caller_id
  LIMIT 1;

  IF v_caller_role IS DISTINCT FROM 'coach' THEN
    RAISE EXCEPTION 'not_a_coach' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.instructor_students isr
    WHERE isr.instructor_id = v_caller_id
      AND isr.student_id = p_target_student_id
  )
  INTO v_student_link_exists;

  IF NOT v_student_link_exists THEN
    RAISE EXCEPTION 'student_not_linked' USING ERRCODE = 'P0001';
  END IF;

  SELECT
    COALESCE(nullif(btrim(p.display_name), ''), p.email, 'Student'),
    p.email
  INTO v_student_display_name, v_student_email
  FROM public.profiles p
  WHERE p.user_id = p_target_student_id
  LIMIT 1;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'group_id', q.group_id,
        'group_name', q.group_name
      )
      ORDER BY q.group_name, q.group_id
    ),
    '[]'::jsonb
  )
  INTO v_groups
  FROM (
    SELECT DISTINCT
      g.id AS group_id,
      g.name AS group_name
    FROM public.group_members gm
    JOIN public.groups g
      ON g.id = gm.group_id
    WHERE gm.user_id = p_target_student_id
      AND g.coach_id = v_caller_id
  ) q;

  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE ti.status = 'completed')::bigint
  INTO v_total_assigned_count, v_total_completed_count
  FROM public.task_instances ti
  JOIN public.assignments a
    ON a.id = ti.assignment_id
  WHERE ti.assignee_id = p_target_student_id
    AND COALESCE(ti.coach_id, a.assigned_by) = v_caller_id;

  IF v_total_assigned_count > 0 THEN
    v_completion_pct := ROUND((v_total_completed_count::numeric * 100.0) / v_total_assigned_count::numeric, 1);
  END IF;

  RETURN jsonb_build_object(
    'student_display_name', COALESCE(v_student_display_name, 'Student'),
    'student_email', v_student_email,
    'enrolled_groups', v_groups,
    'total_assigned_count', v_total_assigned_count,
    'total_completed_count', v_total_completed_count,
    'overall_completion_pct', v_completion_pct
  );
END;
$$;

REVOKE ALL ON FUNCTION public.coach_fetch_student_profile_summary(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coach_fetch_student_profile_summary(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.coach_fetch_student_profile_summary(uuid) TO authenticated;
