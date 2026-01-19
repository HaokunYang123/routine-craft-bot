-- Phase 4: Template Pre-assignment Schema
-- When a student joins a class, automatically assign them tasks from the default template

-- 1. Create templates table (if not exists)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create template_tasks table (stores tasks within a template)
CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  day_offset INTEGER DEFAULT 0, -- 0 = day 1, 1 = day 2, etc.
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add default_template_id to class_sessions
ALTER TABLE class_sessions
ADD COLUMN IF NOT EXISTS default_template_id UUID REFERENCES templates(id) ON DELETE SET NULL;

-- 4. Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for templates
CREATE POLICY "Coaches can view their own templates"
  ON templates FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can create templates"
  ON templates FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update their own templates"
  ON templates FOR UPDATE
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete their own templates"
  ON templates FOR DELETE
  USING (coach_id = auth.uid());

-- 6. RLS Policies for template_tasks
CREATE POLICY "Users can view template tasks for their templates"
  ON template_tasks FOR SELECT
  USING (
    template_id IN (SELECT id FROM templates WHERE coach_id = auth.uid())
  );

CREATE POLICY "Coaches can manage template tasks"
  ON template_tasks FOR ALL
  USING (
    template_id IN (SELECT id FROM templates WHERE coach_id = auth.uid())
  );

-- 7. Function to auto-assign tasks when student joins a class
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
  FOR v_task IN
    SELECT title, description, duration_minutes, day_offset
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
      is_completed,
      created_at
    ) VALUES (
      v_coach_id,
      NEW.student_id,
      v_task.title,
      v_task.description,
      v_task.duration_minutes,
      v_start_date + v_task.day_offset,
      false,
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger on instructor_students table
DROP TRIGGER IF EXISTS on_student_joins_class ON instructor_students;
CREATE TRIGGER on_student_joins_class
  AFTER INSERT ON instructor_students
  FOR EACH ROW
  EXECUTE FUNCTION assign_template_tasks_on_join();

-- 9. Add assigned_student_id column to tasks if not exists
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assigned_student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 10. Index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_student ON tasks(assigned_student_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_template ON template_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_template ON class_sessions(default_template_id);
