-- Migration: Add scheduling columns to template_tasks for Phase 25
-- Purpose: Enable templates to specify per-task due times and time blocks
-- Phase: 25-template-scheduling

-- Step 1: Add due_time_offset_minutes column
-- Minutes from midnight on (assign_date + day_offset) when task is due
-- Range: 0-1439 (0 = midnight, 720 = noon, 1439 = 11:59 PM)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'template_tasks'
    AND column_name = 'due_time_offset_minutes'
  ) THEN
    ALTER TABLE template_tasks
    ADD COLUMN due_time_offset_minutes INTEGER DEFAULT NULL;

    COMMENT ON COLUMN template_tasks.due_time_offset_minutes IS
      'Minutes from midnight on (assign_date + day_offset) when task is due. Range 0-1439.';
  END IF;
END $$;

-- Step 2: Add start_time column for time block start
-- Format: 12-hour time like "1:00 PM", "9:30 AM"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'template_tasks'
    AND column_name = 'start_time'
  ) THEN
    ALTER TABLE template_tasks
    ADD COLUMN start_time TEXT DEFAULT NULL;

    COMMENT ON COLUMN template_tasks.start_time IS
      'Optional time block start in 12-hour format (e.g., "1:00 PM")';
  END IF;
END $$;

-- Step 3: Add end_time column for time block end
-- Format: 12-hour time like "2:00 PM", "10:30 AM"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'template_tasks'
    AND column_name = 'end_time'
  ) THEN
    ALTER TABLE template_tasks
    ADD COLUMN end_time TEXT DEFAULT NULL;

    COMMENT ON COLUMN template_tasks.end_time IS
      'Optional time block end in 12-hour format (e.g., "2:00 PM")';
  END IF;
END $$;

-- Step 4: Create index on template_id for efficient template task queries
-- Optimizes lookups when loading all tasks for a template
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id
ON template_tasks(template_id);
