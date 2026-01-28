-- Migration: Add coach_id column to task_instances for realtime filtering
-- Purpose: Enable efficient realtime subscription filtering for coaches
-- Gap closure: GAP-01 and GAP-02 - realtime events not delivered without filter parameter

-- Step 1: Add coach_id column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'task_instances'
    AND column_name = 'coach_id'
  ) THEN
    ALTER TABLE task_instances
    ADD COLUMN coach_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Step 2: Backfill existing data from assignments.assigned_by
UPDATE task_instances ti
SET coach_id = a.assigned_by
FROM assignments a
WHERE ti.assignment_id = a.id
AND ti.coach_id IS NULL;

-- Step 3: Create trigger function to auto-populate coach_id on INSERT
CREATE OR REPLACE FUNCTION set_task_instance_coach_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignment_id IS NOT NULL AND NEW.coach_id IS NULL THEN
    SELECT assigned_by INTO NEW.coach_id
    FROM assignments WHERE id = NEW.assignment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger (drop first if exists for idempotency)
DROP TRIGGER IF EXISTS set_coach_id_trigger ON task_instances;
CREATE TRIGGER set_coach_id_trigger
BEFORE INSERT ON task_instances
FOR EACH ROW EXECUTE FUNCTION set_task_instance_coach_id();

-- Step 5: Add index for efficient realtime filtering
CREATE INDEX IF NOT EXISTS idx_task_instances_coach_id
ON task_instances(coach_id);

-- Step 6: Update RLS policy to use direct column (faster than subquery)
-- First drop existing policy if it exists
DROP POLICY IF EXISTS "Coaches can view task instances for their students" ON task_instances;
DROP POLICY IF EXISTS "Coaches can manage task instances" ON task_instances;

-- Create new policy using direct column comparison
-- Coaches can see/manage task instances where they are the coach
CREATE POLICY "Coaches can manage task instances"
ON task_instances FOR ALL
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

-- Note: Students still have their own policy based on assignee_id
-- This migration does not affect student access
