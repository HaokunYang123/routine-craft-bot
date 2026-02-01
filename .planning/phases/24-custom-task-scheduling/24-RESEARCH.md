# Phase 24: Custom Task Scheduling - Research

**Researched:** 2026-01-31
**Domain:** React form components, Supabase database migrations, date/time handling
**Confidence:** HIGH

## Summary

This phase enhances the AssignerDashboard to support custom task scheduling with:
1. **Separate Assign Date and Due Date fields** - Students see tasks on assign date, tasks are due on due date
2. **Time blocks with start AND end time** - Display as "12:00 PM - 1:00 PM" format
3. **Monthly recurring option** - Added to existing once/daily/weekly/custom schedule types

The existing codebase already has substantial infrastructure for this:
- `AssignerDashboard.tsx` has a dialog with start/end time fields (using `generateTimeSlots()`)
- `StudentSchedule.tsx` already displays time blocks with `start_time` and `end_time`
- The `task_instances` table exists but needs `end_time` and `assign_date` columns
- The `useAssignments` hook has `getScheduledDates()` helper that needs monthly support

**Primary recommendation:** Add two new columns to `task_instances` (end_time, assign_date), update RPC function `assign_task_to_group` to accept new fields, and modify AssignerDashboard form to separate assign/due date fields.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | ^3.6.0 | Date manipulation | Already used, handles edge cases well |
| react-day-picker | ^8.10.1 | Calendar component | Already integrated via `@/components/ui/calendar` |
| @radix-ui/react-select | ^2.2.5 | Dropdown for time selection | Already used for TIME_SLOTS |
| @radix-ui/react-popover | ^1.1.14 | For calendar popup | Already available |
| zod | ^3.25.76 | Form validation | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | ^7.61.1 | Form state management | For complex forms with validation |

### No New Dependencies Needed
This phase uses existing libraries. No npm install required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── AssignerDashboard.tsx    # Modify: Add assign date/due date separation
├── hooks/
│   └── useAssignments.ts        # Modify: Add monthly to getScheduledDates()
├── components/
│   └── ui/
│       └── date-picker.tsx      # NEW: Reusable date picker with Calendar + Popover
├── lib/
│   └── utils.ts                 # Already has generateTimeSlots()
└── integrations/
    └── supabase/
        └── types.ts             # Regenerate after migration
```

### Pattern 1: Date Picker with Popover
**What:** Reusable date picker combining Calendar + Popover + Button
**When to use:** For date selection fields (assign date, due date)
**Example:**
```typescript
// Source: Shadcn/ui pattern with react-day-picker
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface DatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  label: string;
  minDate?: Date;
}

export function DatePicker({ date, onSelect, label, minDate }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          disabled={(d) => minDate ? d < minDate : false}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
```

### Pattern 2: Monthly Recurring Schedule Calculation
**What:** Calculating monthly recurring dates using date-fns
**When to use:** When generating task instances for monthly schedules
**Example:**
```typescript
// Source: date-fns documentation + codebase pattern
import { addMonths, setDate, getDate, lastDayOfMonth, getDay } from "date-fns";

interface MonthlyConfig {
  dayOfMonth: number;  // 1-31, or -1 for "last day"
}

function getMonthlyScheduledDates(
  startDate: Date,
  endDate: Date,
  config: MonthlyConfig
): Date[] {
  const dates: Date[] = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    let targetDate: Date;

    if (config.dayOfMonth === -1) {
      // "Last day of month" option
      targetDate = lastDayOfMonth(current);
    } else {
      // Specific day of month
      const lastDay = getDate(lastDayOfMonth(current));
      const actualDay = Math.min(config.dayOfMonth, lastDay);
      targetDate = setDate(current, actualDay);
    }

    // Only include if within range
    if (targetDate >= startDate && targetDate <= endDate) {
      dates.push(targetDate);
    }

    current = addMonths(current, 1);
  }

  return dates;
}
```

### Pattern 3: Assign Date vs Due Date Semantics
**What:** Assign date = when student sees the task; Due date = when task is due
**When to use:** For all custom task creation
**Example:**
```typescript
// Database schema semantics
interface TaskInstance {
  assign_date: string;      // When the task appears to student (YYYY-MM-DD)
  scheduled_date: string;   // When the task is due (YYYY-MM-DD) - existing field
  start_time: string | null; // Time block start
  end_time: string | null;   // Time block end
}

// Form state in AssignerDashboard
const [assignDate, setAssignDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
const [dueDate, setDueDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

// Validation: Due date must be >= assign date
const isValid = dueDate >= assignDate;
```

### Anti-Patterns to Avoid
- **Modifying scheduled_date semantics:** Keep `scheduled_date` as "due date" - add separate `assign_date`
- **Time validation in database:** Do time range validation (end > start) in frontend, not DB constraints
- **Hand-rolling monthly calculations:** Use date-fns functions, they handle edge cases (Feb 30 -> Feb 28)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date picker UI | Custom date input with validation | `react-day-picker` Calendar in Popover | Accessibility, edge cases, mobile support |
| Monthly date math | Custom modulo/division logic | date-fns `addMonths`, `setDate`, `lastDayOfMonth` | Leap years, month-end edge cases |
| Time slot generation | Manual loop to create times | Existing `generateTimeSlots()` in `@/lib/utils` | Already tested, consistent format |
| Form state management | useState for each field | React Hook Form (for complex forms) | Validation, dirty state, error handling |

**Key insight:** The codebase already has time handling infrastructure. Extend it rather than rebuild.

## Common Pitfalls

### Pitfall 1: Month-End Date Edge Cases
**What goes wrong:** Setting day 31 on a month with 30 days causes invalid date
**Why it happens:** Not all months have 31 days (Feb has 28/29, April/June/Sept/Nov have 30)
**How to avoid:** Use `Math.min(targetDay, lastDayOfMonth(date))` pattern
**Warning signs:** Tasks scheduled for "31st" missing in February

### Pitfall 2: Assign Date After Due Date
**What goes wrong:** User sets assign date after due date, task appears overdue immediately
**Why it happens:** No validation in form
**How to avoid:**
1. Validate `dueDate >= assignDate` before submit
2. Auto-adjust due date when assign date changes
**Warning signs:** "Overdue" badge on newly created tasks

### Pitfall 3: Time Zone Confusion for Dates
**What goes wrong:** Task appears on wrong day due to UTC vs local timezone
**Why it happens:** Using `new Date()` without timezone awareness
**How to avoid:**
1. Store dates as `YYYY-MM-DD` strings (no time component)
2. Use `format(date, "yyyy-MM-dd")` for database storage
3. Use existing `safeParseISO()` from `@/lib/utils` for parsing
**Warning signs:** Tasks appearing on "yesterday" or "tomorrow" instead of selected day

### Pitfall 4: RPC Function Signature Changes
**What goes wrong:** Frontend sends new parameters, RPC function doesn't accept them
**Why it happens:** Forgetting to update Supabase function signature
**How to avoid:**
1. Update RPC function first
2. Regenerate types with `supabase gen types`
3. Update frontend calls last
**Warning signs:** "Function does not exist" or "invalid argument" errors

### Pitfall 5: Missing Time Block Display on Student View
**What goes wrong:** Time blocks saved correctly but not shown to students
**Why it happens:** StudentSchedule.tsx already expects `start_time`/`end_time` - but the data might not populate
**How to avoid:**
1. Verify `task_instances` query includes new columns
2. Check that `assignGroupTaskMutation` passes times to RPC
**Warning signs:** Empty time block display despite times being set

## Code Examples

### Example 1: AssignerDashboard Date Fields
```typescript
// Source: Pattern from existing codebase + standard Shadcn patterns
// Add to form state
const [assignDate, setAssignDate] = useState(format(new Date(), "yyyy-MM-dd"));
const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));

// JSX for date fields (replace single "Due Date" with both)
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="assignDate">Assign Date</Label>
    <Input
      id="assignDate"
      type="date"
      value={assignDate}
      onChange={(e) => {
        setAssignDate(e.target.value);
        // Auto-adjust due date if now before assign date
        if (dueDate < e.target.value) {
          setDueDate(e.target.value);
        }
      }}
      min={format(new Date(), "yyyy-MM-dd")}
      className="bg-card border-border"
    />
    <p className="text-xs text-muted-foreground">
      When students will see this task
    </p>
  </div>
  <div className="space-y-2">
    <Label htmlFor="dueDate">Due Date</Label>
    <Input
      id="dueDate"
      type="date"
      value={dueDate}
      onChange={(e) => setDueDate(e.target.value)}
      min={assignDate}
      className="bg-card border-border"
    />
    <p className="text-xs text-muted-foreground">
      When this task is due
    </p>
  </div>
</div>
```

### Example 2: Monthly Option in Schedule Type
```typescript
// Source: Extending existing pattern in AssignerDashboard.tsx
// Update schedule type options array
const SCHEDULE_OPTIONS = [
  { value: "once", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },  // NEW
  { value: "custom", label: "Custom days" },
];

// State for monthly day picker
const [monthlyDay, setMonthlyDay] = useState<number>(1); // 1-31 or -1 for last

// JSX for monthly day picker (shown when scheduleType === "monthly")
{scheduleType === "monthly" && (
  <div className="space-y-2">
    <Label>Day of Month</Label>
    <Select value={String(monthlyDay)} onValueChange={(v) => setMonthlyDay(Number(v))}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
          <SelectItem key={day} value={String(day)}>
            {day}
          </SelectItem>
        ))}
        <SelectItem value="-1">Last day of month</SelectItem>
      </SelectContent>
    </Select>
  </div>
)}
```

### Example 3: Database Migration
```sql
-- Source: Supabase migration best practices
-- Migration: Add end_time and assign_date to task_instances
-- File: supabase/migrations/YYYYMMDDHHMMSS_add_scheduling_columns.sql

-- Step 1: Add columns (nullable for backward compatibility)
ALTER TABLE task_instances
ADD COLUMN IF NOT EXISTS end_time TEXT,
ADD COLUMN IF NOT EXISTS assign_date DATE;

-- Step 2: Backfill assign_date from scheduled_date for existing records
UPDATE task_instances
SET assign_date = scheduled_date
WHERE assign_date IS NULL;

-- Step 3: Add index for filtering by assign_date
CREATE INDEX IF NOT EXISTS idx_task_instances_assign_date
ON task_instances(assign_date);

-- Step 4: Update or create RPC function for assign_task_to_group
CREATE OR REPLACE FUNCTION assign_task_to_group(
  p_group_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,  -- This becomes assign_date
  p_end_date DATE DEFAULT NULL,    -- This is the due date (scheduled_date)
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
BEGIN
  -- Create assignment record
  INSERT INTO assignments (
    assigned_by,
    group_id,
    schedule_type,
    start_date,
    end_date,
    is_active
  ) VALUES (
    auth.uid(),
    p_group_id,
    'once',
    COALESCE(p_start_date, CURRENT_DATE),
    COALESCE(p_end_date, CURRENT_DATE),
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
      scheduled_time,
      end_time,
      status,
      coach_id
    ) VALUES (
      v_assignment_id,
      v_member.user_id,
      p_title,
      p_description,
      COALESCE(p_start_date, CURRENT_DATE),  -- assign_date
      COALESCE(p_end_date, CURRENT_DATE),     -- scheduled_date (due date)
      p_start_time,                            -- start time
      p_end_time,                              -- end time
      'pending',
      auth.uid()
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
```

### Example 4: Time Block Display Pattern
```typescript
// Source: Existing pattern in StudentSchedule.tsx (already implemented)
// This is the target display format the phase requires
{task.start_time && task.end_time && (
  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
    <Clock className="w-4 h-4" />
    {task.start_time} - {task.end_time}
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single "Due Date" | Separate Assign + Due Date | This phase | Students see tasks on assign date, due on due date |
| Single `scheduled_time` | Separate `start_time` + `end_time` | Partial (UI exists) | Full time block display "12:00 PM - 1:00 PM" |
| once/daily/weekly/custom | + monthly option | This phase | Monthly recurring tasks supported |

**Deprecated/outdated:**
- `start_time` field exists in StudentSchedule UI but may not be in DB - verify and add if needed
- Current `dueDate` in AssignerDashboard is used for both assign and due - needs separation

## Open Questions

1. **RPC function existence**
   - What we know: `useAssignments.ts` calls `assign_task_to_group` RPC
   - What's unclear: Whether this RPC already exists in database or needs creation
   - Recommendation: Check database for function, create if missing, update if exists

2. **start_time column in task_instances**
   - What we know: `StudentSchedule.tsx` queries `start_time` and `end_time` from task_instances
   - What's unclear: Whether `start_time` column exists (not in types.ts, but scheduled_time is)
   - Recommendation: The existing `scheduled_time` might need to be used as `start_time`, or renamed. Verify DB schema first.

3. **Monthly recurring: What fields to store?**
   - What we know: Need day-of-month (1-31 or "last")
   - What's unclear: Whether to add new column or store in existing `schedule_days` array
   - Recommendation: Extend `schedule_days` array usage - `[15]` means 15th of month, `[-1]` means last day

## Sources

### Primary (HIGH confidence)
- Local codebase analysis: `src/pages/AssignerDashboard.tsx` (existing form structure)
- Local codebase analysis: `src/pages/student/StudentSchedule.tsx` (time block display pattern)
- Local codebase analysis: `src/hooks/useAssignments.ts` (schedule calculation logic)
- Local codebase analysis: `src/integrations/supabase/types.ts` (current DB schema)

### Secondary (MEDIUM confidence)
- [date-fns official documentation](https://date-fns.org/) - date manipulation functions
- [Supabase migration docs](https://supabase.com/docs/guides/deployment/database-migrations) - ALTER TABLE patterns
- [Shadcn Calendar pattern](https://ui.shadcn.com/docs/components/date-picker) - Date picker with Popover

### Tertiary (LOW confidence)
- WebSearch for monthly recurrence patterns (verified against date-fns docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project
- Architecture: HIGH - Extending existing patterns
- Pitfalls: HIGH - Based on codebase analysis and date handling experience
- Database migration: MEDIUM - RPC function existence needs verification

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (30 days - stable domain, no external API dependencies)
