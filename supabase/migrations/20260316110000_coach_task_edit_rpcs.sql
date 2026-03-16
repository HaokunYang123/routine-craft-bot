-- Phase 1.1: WS-TASK-EDIT Backend RPCs
-- Note: the live schema uses task_instances.assignment_id for the active task model.
-- recurring_schedules does not link to task_instances, so recurring edits are applied
-- through assignments.schedule_type / schedule_days / start_date and cascaded to the
-- assignment's future pending task_instances.

CREATE OR REPLACE FUNCTION public.coach_edit_single_instance(
  p_target_instance_id uuid,
  p_revised_date date DEFAULT NULL,
  p_revised_start_time time DEFAULT NULL,
  p_revised_end_time time DEFAULT NULL,
  p_modification_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_instance public.task_instances%ROWTYPE;
  v_assignment public.assignments%ROWTYPE;
  v_coach_link_exists boolean := false;
  v_effective_start_text text;
  v_effective_end_text text;
  v_effective_start time;
  v_effective_end time;
  v_trimmed_reason text := nullif(btrim(p_modification_reason), '');
  v_old_values jsonb;
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

  SELECT ti.*
  INTO v_instance
  FROM public.task_instances ti
  WHERE ti.id = p_target_instance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'instance_not_found_or_unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF v_instance.status NOT IN ('pending', 'missed') THEN
    RAISE EXCEPTION 'instance_not_editable' USING ERRCODE = 'P0001';
  END IF;

  IF v_instance.assignment_id IS NULL THEN
    RAISE EXCEPTION 'instance_not_found_or_unauthorized' USING ERRCODE = 'P0001';
  END IF;

  SELECT a.*
  INTO v_assignment
  FROM public.assignments a
  WHERE a.id = v_instance.assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'instance_not_found_or_unauthorized' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.instructor_students isr
    WHERE isr.instructor_id = v_caller_id
      AND isr.student_id = v_instance.assignee_id
  )
  INTO v_coach_link_exists;

  IF NOT v_coach_link_exists THEN
    RAISE EXCEPTION 'instance_not_found_or_unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF p_revised_date IS NOT NULL AND p_revised_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'revised_date_in_past' USING ERRCODE = 'P0001';
  END IF;

  v_effective_start_text := COALESCE(p_revised_start_time::text, nullif(btrim(v_instance.start_time), ''));
  v_effective_end_text := COALESCE(p_revised_end_time::text, nullif(btrim(v_instance.end_time), ''));

  BEGIN
    IF v_effective_start_text IS NOT NULL THEN
      v_effective_start := v_effective_start_text::time;
    END IF;

    IF v_effective_end_text IS NOT NULL THEN
      v_effective_end := v_effective_end_text::time;
    END IF;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'invalid_time_value' USING ERRCODE = 'P0001';
  END;

  IF v_effective_start IS NOT NULL
     AND v_effective_end IS NOT NULL
     AND v_effective_end <= v_effective_start THEN
    RAISE EXCEPTION 'invalid_time_range' USING ERRCODE = 'P0001';
  END IF;

  v_old_values := jsonb_build_object(
    'old_date', v_instance.scheduled_date,
    'old_start_time', v_instance.start_time,
    'old_end_time', v_instance.end_time,
    'old_status', v_instance.status,
    'assignment_id', v_instance.assignment_id,
    'assignee_id', v_instance.assignee_id
  );

  UPDATE public.task_instances
  SET scheduled_date = COALESCE(p_revised_date, scheduled_date),
      start_time = COALESCE(p_revised_start_time::text, start_time),
      scheduled_time = COALESCE(p_revised_start_time, scheduled_time),
      end_time = COALESCE(p_revised_end_time::text, end_time),
      coach_note = COALESCE(v_trimmed_reason, coach_note),
      is_customized = true,
      updated_at = now(),
      updated_by = v_caller_id
  WHERE id = p_target_instance_id;

  INSERT INTO public.activity_events (user_id, event_type, metadata)
  VALUES (
    v_caller_id,
    'task_date_edited',
    v_old_values || jsonb_build_object(
      'new_date', COALESCE(p_revised_date, v_instance.scheduled_date),
      'new_start_time', COALESCE(p_revised_start_time::text, v_instance.start_time),
      'new_end_time', COALESCE(p_revised_end_time::text, v_instance.end_time),
      'instance_id', p_target_instance_id,
      'modification_reason', v_trimmed_reason
    )
  );

  RETURN jsonb_build_object(
    'instance_id', p_target_instance_id,
    'outcome', 'updated'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.coach_edit_single_instance(uuid, date, time, time, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coach_edit_single_instance(uuid, date, time, time, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.coach_edit_single_instance(uuid, date, time, time, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.coach_edit_recurring_pattern(
  p_target_schedule_id uuid,
  p_revised_weekday integer DEFAULT NULL,
  p_revised_pattern_start time DEFAULT NULL,
  p_revised_pattern_end time DEFAULT NULL,
  p_cascade_to_future boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_assignment public.assignments%ROWTYPE;
  v_sample_instance public.task_instances%ROWTYPE;
  v_has_unlinked_students boolean := false;
  v_effective_start_text text;
  v_effective_end_text text;
  v_effective_start time;
  v_effective_end time;
  v_old_values jsonb;
  v_cascaded_count integer := 0;
  v_new_schedule_days integer[];
  v_new_start_date date;
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

  SELECT a.*
  INTO v_assignment
  FROM public.assignments a
  WHERE a.id = p_target_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'schedule_not_found_or_unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF v_assignment.schedule_type NOT IN ('daily', 'weekly', 'custom') THEN
    RAISE EXCEPTION 'schedule_not_editable' USING ERRCODE = 'P0001';
  END IF;

  SELECT ti.*
  INTO v_sample_instance
  FROM public.task_instances ti
  WHERE ti.assignment_id = v_assignment.id
  ORDER BY ti.scheduled_date, ti.id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'schedule_not_found_or_unauthorized' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.task_instances ti
    WHERE ti.assignment_id = v_assignment.id
      AND NOT EXISTS (
        SELECT 1
        FROM public.instructor_students isr
        WHERE isr.instructor_id = v_caller_id
          AND isr.student_id = ti.assignee_id
      )
  )
  INTO v_has_unlinked_students;

  IF v_has_unlinked_students THEN
    RAISE EXCEPTION 'schedule_not_found_or_unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF p_revised_weekday IS NOT NULL AND (p_revised_weekday < 0 OR p_revised_weekday > 6) THEN
    RAISE EXCEPTION 'invalid_weekday_range' USING ERRCODE = 'P0001';
  END IF;

  IF p_revised_weekday IS NOT NULL AND v_assignment.schedule_type = 'daily' THEN
    RAISE EXCEPTION 'weekday_not_applicable' USING ERRCODE = 'P0001';
  END IF;

  v_effective_start_text := COALESCE(p_revised_pattern_start::text, nullif(btrim(v_sample_instance.start_time), ''));
  v_effective_end_text := COALESCE(p_revised_pattern_end::text, nullif(btrim(v_sample_instance.end_time), ''));

  BEGIN
    IF v_effective_start_text IS NOT NULL THEN
      v_effective_start := v_effective_start_text::time;
    END IF;

    IF v_effective_end_text IS NOT NULL THEN
      v_effective_end := v_effective_end_text::time;
    END IF;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'invalid_time_value' USING ERRCODE = 'P0001';
  END;

  IF v_effective_start IS NOT NULL
     AND v_effective_end IS NOT NULL
     AND v_effective_end <= v_effective_start THEN
    RAISE EXCEPTION 'invalid_time_range' USING ERRCODE = 'P0001';
  END IF;

  v_old_values := jsonb_build_object(
    'old_schedule_type', v_assignment.schedule_type,
    'old_start_date', v_assignment.start_date,
    'old_end_date', v_assignment.end_date,
    'old_schedule_days', to_jsonb(COALESCE(v_assignment.schedule_days, ARRAY[]::integer[])),
    'old_start_time', v_sample_instance.start_time,
    'old_end_time', v_sample_instance.end_time
  );

  v_new_schedule_days := COALESCE(v_assignment.schedule_days, ARRAY[]::integer[]);
  v_new_start_date := v_assignment.start_date;

  IF p_revised_weekday IS NOT NULL THEN
    v_new_schedule_days := ARRAY[p_revised_weekday];
    v_new_start_date := GREATEST(CURRENT_DATE, v_assignment.start_date);
    v_new_start_date := v_new_start_date
      + ((p_revised_weekday - EXTRACT(DOW FROM v_new_start_date)::integer + 7) % 7);
  END IF;

  UPDATE public.assignments
  SET schedule_days = CASE
        WHEN p_revised_weekday IS NULL THEN schedule_days
        ELSE v_new_schedule_days
      END,
      start_date = CASE
        WHEN p_revised_weekday IS NULL THEN start_date
        ELSE v_new_start_date
      END
  WHERE id = v_assignment.id;

  IF p_cascade_to_future THEN
    WITH updated AS (
      UPDATE public.task_instances ti
      SET start_time = COALESCE(p_revised_pattern_start::text, ti.start_time),
          scheduled_time = COALESCE(p_revised_pattern_start, ti.scheduled_time),
          end_time = COALESCE(p_revised_pattern_end::text, ti.end_time),
          scheduled_date = CASE
            WHEN p_revised_weekday IS NOT NULL THEN
              ti.scheduled_date
              + ((p_revised_weekday - EXTRACT(DOW FROM ti.scheduled_date)::integer + 7) % 7)
            ELSE
              ti.scheduled_date
          END,
          is_customized = true,
          updated_at = now(),
          updated_by = v_caller_id
      WHERE ti.assignment_id = v_assignment.id
        AND ti.scheduled_date >= CURRENT_DATE
        AND ti.status = 'pending'
      RETURNING ti.id
    )
    SELECT count(*)
    INTO v_cascaded_count
    FROM updated;
  END IF;

  INSERT INTO public.activity_events (user_id, event_type, metadata)
  VALUES (
    v_caller_id,
    'recurring_schedule_edited',
    v_old_values || jsonb_build_object(
      'schedule_id', p_target_schedule_id,
      'assignment_id', v_assignment.id,
      'new_weekday', p_revised_weekday,
      'new_schedule_days', to_jsonb(CASE
        WHEN p_revised_weekday IS NULL THEN COALESCE(v_assignment.schedule_days, ARRAY[]::integer[])
        ELSE v_new_schedule_days
      END),
      'new_start_date', CASE
        WHEN p_revised_weekday IS NULL THEN v_assignment.start_date
        ELSE v_new_start_date
      END,
      'new_start_time', COALESCE(p_revised_pattern_start::text, v_sample_instance.start_time),
      'new_end_time', COALESCE(p_revised_pattern_end::text, v_sample_instance.end_time),
      'cascade', p_cascade_to_future,
      'cascaded_instance_count', v_cascaded_count
    )
  );

  RETURN jsonb_build_object(
    'schedule_id', p_target_schedule_id,
    'outcome', 'updated',
    'cascaded_instance_count', v_cascaded_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.coach_edit_recurring_pattern(uuid, integer, time, time, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coach_edit_recurring_pattern(uuid, integer, time, time, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.coach_edit_recurring_pattern(uuid, integer, time, time, boolean) TO authenticated;
