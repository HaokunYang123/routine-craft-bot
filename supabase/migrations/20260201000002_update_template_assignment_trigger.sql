-- Migration: Update assign_template_tasks_on_join to copy scheduling fields
-- Purpose: When templates with scheduling are assigned, copy start_time and end_time to task_instances
-- Phase: 25-template-scheduling
-- Depends on: 20260119000001_template_preassignment.sql, 20260201000001_add_template_task_scheduling.sql

-- Replace the existing function to include scheduling fields
CREATE OR REPLACE FUNCTION assign_template_tasks_on_join()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id UUID;
  v_coach_id UUID;
  v_task RECORD;
  v_start_date DATE := CURRENT_DATE;
BEGIN
  -- Get the default template for this class session
  SELECT default_template_id, coach_id INTO v_template_id, v_coach_id
  FROM class_sessions
  WHERE id = NEW.class_session_id;

  -- If no default template, skip
  IF v_template_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Copy each template task as a new task for the student
  -- Now includes scheduling fields: start_time, end_time
  FOR v_task IN
    SELECT
      title,
      description,
      duration_minutes,
      day_offset,
      sort_order,
      due_time_offset_minutes,  -- Minutes from midnight for due time
      start_time,               -- Time block start (e.g., "9:00 AM")
      end_time                  -- Time block end (e.g., "10:00 AM")
    FROM template_tasks
    WHERE template_id = v_template_id
    ORDER BY day_offset, sort_order
  LOOP
    INSERT INTO tasks (
      user_id,
      assigned_student_id,
      title,
      description,
      duration_minutes,
      due_date,
      start_time,        -- Time block start from template
      end_time,          -- Time block end from template
      is_completed,
      created_at
    ) VALUES (
      v_coach_id,
      NEW.student_id,
      v_task.title,
      v_task.description,
      v_task.duration_minutes,
      v_start_date + v_task.day_offset,  -- Due date offset by days
      v_task.start_time,                 -- Copy time block start
      v_task.end_time,                   -- Copy time block end
      false,
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on_student_joins_class already exists and will use this updated function.
-- No need to recreate the trigger since it references the function by name.

COMMENT ON FUNCTION assign_template_tasks_on_join() IS
  'Trigger function that copies template tasks to student when they join a class. Includes scheduling fields (start_time, end_time) from template.';
