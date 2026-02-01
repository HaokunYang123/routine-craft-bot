-- Migration: Add scheduling columns to task_instances for Phase 24
-- Purpose: Support separate assign date (visibility), due date, and time blocks
-- Phase: 24-custom-task-scheduling

-- Step 1: Add start_time column (nullable, for time block start)
-- Note: scheduled_time already exists and will serve as start_time alias
-- Adding explicit start_time for clarity and future compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'task_instances'
    AND column_name = 'start_time'
  ) THEN
    ALTER TABLE task_instances
    ADD COLUMN start_time TEXT;
  END IF;
END $$;

-- Step 2: Add end_time column (nullable, for time block end)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'task_instances'
    AND column_name = 'end_time'
  ) THEN
    ALTER TABLE task_instances
    ADD COLUMN end_time TEXT;
  END IF;
END $$;

-- Step 3: Add assign_date column (nullable initially for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'task_instances'
    AND column_name = 'assign_date'
  ) THEN
    ALTER TABLE task_instances
    ADD COLUMN assign_date DATE;
  END IF;
END $$;

-- Step 4: Backfill assign_date from scheduled_date for existing records
-- This ensures existing tasks remain visible (assign_date = due_date for legacy data)
UPDATE task_instances
SET assign_date = scheduled_date::DATE
WHERE assign_date IS NULL;

-- Step 5: Create index on assign_date for efficient filtering
-- This supports queries like "show tasks visible today"
CREATE INDEX IF NOT EXISTS idx_task_instances_assign_date
ON task_instances(assign_date);

-- Step 6: Create or replace the assign_task_to_group RPC function
-- This function creates task instances for all members of a group
-- Parameters:
--   p_group_id: UUID of the group to assign to
--   p_title: Task title
--   p_description: Optional task description
--   p_assign_date: When student sees the task (visibility date)
--   p_due_date: When task is due (maps to scheduled_date)
--   p_start_time: Optional time block start (e.g., "12:00 PM")
--   p_end_time: Optional time block end (e.g., "1:00 PM")
CREATE OR REPLACE FUNCTION assign_task_to_group(
  p_group_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_assign_date DATE DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_start_time TEXT DEFAULT NULL,
  p_end_time TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id UUID;
  v_member RECORD;
  v_count INTEGER := 0;
  v_coach_id UUID;
  v_effective_assign_date DATE;
  v_effective_due_date DATE;
BEGIN
  -- Security check: ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Store coach ID for later use
  v_coach_id := auth.uid();

  -- Set effective dates (default to current date if not provided)
  v_effective_assign_date := COALESCE(p_assign_date, CURRENT_DATE);
  v_effective_due_date := COALESCE(p_due_date, CURRENT_DATE);

  -- Create assignment record
  INSERT INTO assignments (
    assigned_by,
    group_id,
    schedule_type,
    start_date,
    end_date,
    is_active
  ) VALUES (
    v_coach_id,
    p_group_id,
    'once',
    v_effective_assign_date,
    v_effective_due_date,
    true
  )
  RETURNING id INTO v_assignment_id;

  -- Create task instance for each group member
  FOR v_member IN
    SELECT user_id FROM group_members WHERE group_id = p_group_id
  LOOP
    INSERT INTO task_instances (
      assignment_id,
      assignee_id,
      name,
      description,
      assign_date,
      scheduled_date,
      start_time,
      scheduled_time,
      end_time,
      status,
      coach_id
    ) VALUES (
      v_assignment_id,
      v_member.user_id,
      p_title,
      p_description,
      v_effective_assign_date,
      v_effective_due_date,
      p_start_time,
      p_start_time,  -- Also set scheduled_time for backward compatibility
      p_end_time,
      'pending',
      v_coach_id
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Step 7: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION assign_task_to_group(UUID, TEXT, TEXT, DATE, DATE, TEXT, TEXT) TO authenticated;

-- Note: The existing trigger set_coach_id_trigger will automatically populate coach_id
-- if it's not provided, but we explicitly set it in the function for clarity.
