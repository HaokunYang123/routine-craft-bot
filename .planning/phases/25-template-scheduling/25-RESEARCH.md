# Phase 25: Template Scheduling - Research

**Researched:** 2026-01-31
**Domain:** Template system, task scheduling, database schema, React UI
**Confidence:** HIGH

## Summary

This phase enhances the template system to support Phase 24's scheduling features:
1. **Per-task due time offsets** - Each template task has its own due time (offset from assign date)
2. **Single assign date for template** - All tasks in a template share one assign date
3. **Time blocks in templates** - Template tasks can specify start_time and end_time
4. **Template builder UI updates** - Show due time offset per task, time block fields

The existing template infrastructure is well-established:
- `templates` table with coach_id, name, description
- `template_tasks` table with title, description, duration_minutes, day_offset, sort_order
- `useTemplates` hook with create/update/delete mutations
- `ManualTemplateBuilder.tsx` component for creating templates
- `Templates.tsx` page with AI builder, manual builder, and library tabs
- `assign_template_tasks_on_join()` trigger automatically assigns template tasks when student joins class

**Primary gap:** Template tasks don't support time-of-day scheduling (start_time, end_time, due_time_offset). The `assign_template_tasks_on_join()` function creates task_instances with only day_offset, not time offsets or time blocks.

**Primary recommendation:** Add `due_time_offset_minutes` column to template_tasks, add `start_time`/`end_time` columns for time blocks, update template builder UI to support these fields, and modify the assignment trigger to populate them correctly.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | ^3.6.0 | Date/time manipulation | Already used, handles time offsets |
| @radix-ui/react-select | ^2.2.5 | Dropdown for time selection | Already used for time pickers |
| React Query | ^5.x | Data mutations | Already used in useTemplates hook |

### No New Dependencies Needed
This phase uses existing libraries. No npm install required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── templates/
│       └── ManualTemplateBuilder.tsx  # Modify: Add due time offset, time block fields
├── hooks/
│   └── useTemplates.ts                # Modify: Include new fields in mutations
├── pages/
│   └── Templates.tsx                  # Modify: Preview shows time offsets
supabase/
└── migrations/
    └── 2026XXXX_add_template_task_scheduling.sql  # NEW: Add columns
```

### Pattern 1: Due Time Offset (Minutes from Assign Date)
**What:** Each template task stores offset in minutes from the template's assign date
**When to use:** When calculating actual due time for assigned template tasks
**Example:**
```typescript
// Template task definition
interface TemplateTask {
  title: string;
  day_offset: number;              // Day 0, 1, 2... (existing)
  due_time_offset_minutes: number; // Minutes from midnight on that day
  start_time: string | null;       // Optional time block start
  end_time: string | null;         // Optional time block end
}

// When assigning template (assign_date = 2026-02-01)
// Task with day_offset=0, due_time_offset_minutes=540 (9:00 AM)
// -> due_date = 2026-02-01, due_time = 09:00

// Task with day_offset=1, due_time_offset_minutes=1020 (5:00 PM)
// -> due_date = 2026-02-02, due_time = 17:00
```

### Pattern 2: Template Assignment with Assign Date
**What:** When assigning a template, all tasks share a single assign_date
**When to use:** When coach assigns template to student or group
**Example:**
```typescript
// UI for template assignment
interface TemplateAssignment {
  template_id: string;
  assign_date: string;  // YYYY-MM-DD - when all tasks become visible
  student_ids: string[];
}

// Each template task becomes a task_instance
// assign_date (same for all) + day_offset = actual assign date per task
// assign_date + day_offset + due_time_offset_minutes = actual due date/time
```

### Pattern 3: Time Block Support in Templates
**What:** Template tasks can define time blocks (start_time, end_time)
**When to use:** For scheduled activities (class times, practice sessions)
**Example:**
```typescript
// Template task with time block
{
  title: "Practice Session",
  day_offset: 0,
  due_time_offset_minutes: 840,  // Due at 2:00 PM
  start_time: "1:00 PM",          // Time block: 1:00 PM
  end_time: "2:00 PM",            // Time block: 2:00 PM
  duration_minutes: 60
}

// When assigned, creates task_instance with:
// assign_date = template assign_date
// scheduled_date = assign_date + 0 days = assign_date
// start_time = "1:00 PM"
// end_time = "2:00 PM"
```

### Anti-Patterns to Avoid
- **Storing absolute dates in templates:** Templates are reusable, store offsets not dates
- **Different assign dates per task:** Templates have ONE assign date, tasks offset from it
- **Hard-coding time formats:** Use existing generateTimeSlots() from utils for consistency

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time offset calculation | Manual date/time math | date-fns `addMinutes`, `addDays` | Edge cases (DST, midnight rollover) |
| Time slot generation | Custom loop | Existing `generateTimeSlots()` in utils | Consistent format |
| Template mutation | Direct Supabase calls | Extend existing `useTemplates` mutations | Cache invalidation, error handling |

## Common Pitfalls

### Pitfall 1: Confusing Day Offset with Time Offset
**What goes wrong:** Setting due_time_offset_minutes to 1 thinking it's "1 day later"
**Why it happens:** Two separate offset fields (day_offset for days, due_time_offset_minutes for time-of-day)
**How to avoid:**
1. day_offset: 0-N (which day relative to assign date)
2. due_time_offset_minutes: 0-1439 (time of day in minutes from midnight)
3. Combined: assign_date + day_offset days + due_time_offset_minutes
**Warning signs:** Tasks due at wrong time of day

### Pitfall 2: Template Assignment Without Assign Date
**What goes wrong:** Template assigned but tasks appear immediately
**Why it happens:** Not capturing assign_date when assigning template
**How to avoid:**
1. Template assignment UI MUST ask for assign date
2. assign_template_tasks_on_join needs assign_date parameter
**Warning signs:** All template tasks visible instantly, no gradual rollout

### Pitfall 3: Time Block Validation
**What goes wrong:** start_time after end_time in template task
**Why it happens:** No validation in ManualTemplateBuilder
**How to avoid:**
1. If both start_time and end_time set, validate end > start
2. Show error message in UI before save
**Warning signs:** Weird time blocks like "5:00 PM - 12:00 PM"

### Pitfall 4: Updating Assigned Templates
**What goes wrong:** Editing template doesn't update already-assigned instances
**Why it happens:** Template is a blueprint, instances are copies
**How to avoid:**
1. Clarify: Editing template only affects FUTURE assignments
2. If coach wants to update existing instances, that's a separate action
**Warning signs:** User confusion about why changes don't appear for students

### Pitfall 5: Monthly Recurring Templates
**What goes wrong:** Template with monthly recurring tasks fails
**Why it happens:** Templates are for one-time assignment sequences, not recurring schedules
**How to avoid:**
1. Templates are assigned ONCE with an assign_date
2. For recurring templates, coach re-assigns monthly (or uses recurring assignments separately)
3. Don't conflate template assignment with recurring schedules
**Warning signs:** User asking "how do I make this template repeat monthly?"

## Code Examples

### Example 1: Template Task Schema with Scheduling
```sql
-- Source: Extending existing template_tasks table
-- Migration: supabase/migrations/2026XXXX_add_template_task_scheduling.sql

-- Add scheduling columns to template_tasks
ALTER TABLE template_tasks
ADD COLUMN IF NOT EXISTS due_time_offset_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS start_time TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_time TEXT DEFAULT NULL;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id
ON template_tasks(template_id);

-- Comments for clarity
COMMENT ON COLUMN template_tasks.due_time_offset_minutes IS
  'Minutes from midnight on (assign_date + day_offset) when task is due. E.g., 540 = 9:00 AM';
COMMENT ON COLUMN template_tasks.start_time IS
  'Optional time block start in 12-hour format (e.g., "1:00 PM")';
COMMENT ON COLUMN template_tasks.end_time IS
  'Optional time block end in 12-hour format (e.g., "2:00 PM")';
```

### Example 2: ManualTemplateBuilder with Time Fields
```typescript
// Source: Extending ManualTemplateBuilder.tsx component
interface ManualTask {
  title: string;
  description: string;
  duration_minutes: number;
  day_offset: number;
  due_time_offset_minutes?: number;  // NEW
  start_time?: string;               // NEW
  end_time?: string;                 // NEW
}

// In ManualTemplateBuilder component
const [tasks, setTasks] = useState<ManualTask[]>([{
  title: "",
  description: "",
  duration_minutes: 15,
  day_offset: 0,
  due_time_offset_minutes: undefined,  // No due time = all-day task
  start_time: undefined,
  end_time: undefined,
}]);

// JSX for time fields (per task)
<div className="grid grid-cols-3 gap-2">
  <div className="space-y-1">
    <Label className="text-xs">Due Time (optional)</Label>
    <Select
      value={task.due_time_offset_minutes?.toString() ?? ""}
      onValueChange={(v) => updateTask(index, "due_time_offset_minutes", v ? parseInt(v) : undefined)}
    >
      <SelectTrigger className="bg-card border-border">
        <SelectValue placeholder="All day" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">All day</SelectItem>
        {generateTimeSlots().map((slot) => (
          <SelectItem key={slot.value} value={slot.value.toString()}>
            {slot.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  <div className="space-y-1">
    <Label className="text-xs">Start Time (optional)</Label>
    <Select
      value={task.start_time ?? ""}
      onValueChange={(v) => updateTask(index, "start_time", v || undefined)}
    >
      <SelectTrigger className="bg-card border-border">
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        {generateTimeSlots().map((slot) => (
          <SelectItem key={slot.label} value={slot.label}>
            {slot.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  <div className="space-y-1">
    <Label className="text-xs">End Time (optional)</Label>
    <Select
      value={task.end_time ?? ""}
      onValueChange={(v) => updateTask(index, "end_time", v || undefined)}
      disabled={!task.start_time}
    >
      <SelectTrigger className="bg-card border-border">
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        {generateTimeSlots()
          .filter((slot) => !task.start_time || slot.label > task.start_time)
          .map((slot) => (
            <SelectItem key={slot.label} value={slot.label}>
              {slot.label}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </div>
</div>
```

### Example 3: Updated assign_template_tasks_on_join Function
```sql
-- Source: Extending existing trigger function
CREATE OR REPLACE FUNCTION assign_template_tasks_on_join()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id UUID;
  v_coach_id UUID;
  v_task RECORD;
  v_assign_date DATE := CURRENT_DATE;  -- Could be parameterized in future
BEGIN
  -- Get the default template for this class session
  SELECT default_template_id, coach_id INTO v_template_id, v_coach_id
  FROM class_sessions
  WHERE id = NEW.class_session_id;

  IF v_template_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Copy each template task as a new task_instance
  FOR v_task IN
    SELECT
      title,
      description,
      duration_minutes,
      day_offset,
      due_time_offset_minutes,  -- NEW
      start_time,               -- NEW
      end_time                  -- NEW
    FROM template_tasks
    WHERE template_id = v_template_id
    ORDER BY day_offset, sort_order
  LOOP
    INSERT INTO task_instances (
      assignee_id,
      name,
      description,
      duration_minutes,
      assign_date,           -- NEW: v_assign_date + day_offset
      scheduled_date,        -- Due date
      start_time,            -- NEW: Time block start
      end_time,              -- NEW: Time block end
      status,
      coach_id,
      created_at
    ) VALUES (
      NEW.student_id,
      v_task.title,
      v_task.description,
      v_task.duration_minutes,
      v_assign_date + v_task.day_offset,                    -- Assign date offset by days
      v_assign_date + v_task.day_offset,                    -- Due date (same day by default)
      v_task.start_time,                                     -- Time block
      v_task.end_time,
      'pending',
      v_coach_id,
      NOW()
    );

    -- If template task has due_time_offset_minutes, update scheduled_date
    -- (This creates due time different from assign date if needed)
    -- For simplicity, we're keeping scheduled_date as date-only
    -- The due_time_offset_minutes could be stored separately or ignored for now

  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Example 4: Template Preview with Time Display
```typescript
// Source: Templates.tsx preview dialog
// Show per-task scheduling in preview
{previewTemplate?.tasks?.map((task, index) => (
  <div key={task.id || index} className="p-3 bg-secondary/30 rounded-lg">
    <div className="flex items-start justify-between">
      <div>
        <p className="font-medium">{task.title}</p>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
        )}
        {/* NEW: Show time information */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          {task.due_time_offset_minutes !== null && (
            <span className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">
              Due: {minutesToTimeString(task.due_time_offset_minutes)}
            </span>
          )}
          {task.start_time && task.end_time && (
            <span className="bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded">
              {task.start_time} - {task.end_time}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 ml-4">
        <span className="bg-secondary px-2 py-1 rounded">Day {task.day_offset + 1}</span>
        <span className="bg-secondary px-2 py-1 rounded">{task.duration_minutes}m</span>
      </div>
    </div>
  </div>
))}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Template tasks have only day_offset | + due_time_offset_minutes | This phase | Tasks can be due at specific times |
| No time blocks in templates | + start_time, end_time | This phase | Template tasks support scheduled time blocks |
| Assign date implicit (today) | Explicit assign_date when assigning | This phase | Coach controls when template tasks become visible |

**Deprecated/outdated:**
- `assign_template_tasks_on_join()` doesn't use assign_date parameter yet
- Template builder UI doesn't show time fields

## Open Questions

1. **Template Assignment UI**
   - What we know: Templates auto-assign when student joins class via `assign_template_tasks_on_join()`
   - What's unclear: Is there manual template assignment UI? Where does coach specify assign_date?
   - Recommendation: Check if AssignerDashboard has template selection, or if templates are only class-default

2. **Due Time vs Time Block**
   - What we know: Templates can have due_time_offset_minutes AND start_time/end_time
   - What's unclear: Are these independent or should they be linked?
   - Recommendation: Keep independent. Time block = scheduled activity window, due time = when task must be done by

3. **Recurring Template Assignments**
   - What we know: Templates are assigned once per student
   - What's unclear: How do coaches re-assign same template monthly/weekly?
   - Recommendation: Out of scope for Phase 25. Focus on single assignment with proper scheduling.

## Sources

### Primary (HIGH confidence)
- Local codebase analysis: `supabase/migrations/20260119000001_template_preassignment.sql` (current schema)
- Local codebase analysis: `src/hooks/useTemplates.ts` (template CRUD operations)
- Local codebase analysis: `src/components/templates/ManualTemplateBuilder.tsx` (UI patterns)
- Local codebase analysis: `src/pages/Templates.tsx` (template workflow)
- Phase 24 completion: `task_instances` now has assign_date, start_time, end_time columns

### Secondary (MEDIUM confidence)
- [date-fns documentation](https://date-fns.org/) - Time offset calculations
- Supabase RLS patterns - Template access control

### Tertiary (LOW confidence)
- None - research based entirely on codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project
- Architecture: HIGH - Extending existing template system
- Pitfalls: HIGH - Based on template and scheduling experience
- Database migration: HIGH - Clear pattern from Phase 24

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (30 days - internal system, no external dependencies)
