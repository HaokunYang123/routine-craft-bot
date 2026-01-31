# Phase 21: Task Assignment Cleanup - Research

**Researched:** 2026-01-31
**Domain:** React form refactoring with shadcn/ui components
**Confidence:** HIGH

## Summary

This phase involves simplifying the custom task assignment form in `AssignerDashboard.tsx` by consolidating duplicate date fields. The current form has separate "Start Date" and "End Date" fields both defaulting to today, which is redundant for most single-day task assignments.

The research confirms that all necessary UI components already exist in the codebase. The project uses shadcn/ui (Radix UI primitives) with existing Collapsible, RadioGroup, and Select components. The pattern for expandable sections using `@radix-ui/react-collapsible` is already established in multiple files. The recurring schedule pattern from `RecurringSchedules.tsx` provides a proven UI for daily/weekly/custom day selection.

**Primary recommendation:** Use existing shadcn/ui Collapsible component for the "Multi-day task" expandable section, and adapt the recurring schedule pattern from RecurringSchedules.tsx for the schedule type selector.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-collapsible | ^1.1.11 | Expandable "Multi-day task" section | Already used in StudentHome.tsx, CoachCalendar.tsx |
| @radix-ui/react-radio-group | ^1.3.7 | Recurring schedule type selector (optional) | Native to project, accessible by default |
| @radix-ui/react-select | ^2.2.5 | Dropdown selections | Already used throughout the form |
| date-fns | ^3.6.0 | Date manipulation and formatting | Already used for default date values |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.462.0 | Icons (ChevronDown, Calendar, etc.) | For expandable section indicators |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RadioGroup for schedule type | Select dropdown | Select is more compact, RadioGroup is more visual - either works |
| Collapsible for multi-day | Always-visible with conditional | Collapsible keeps form cleaner for common case |

**Installation:**
```bash
# No new dependencies needed - all components already exist
```

## Architecture Patterns

### Recommended Form Structure
```
Dialog Form:
1. Group (Select) - unchanged
2. Task Title (Input) - unchanged
3. Description (Textarea) - unchanged
4. Due Date (Input type="date") - NEW: replaces startDate
5. Recurring Schedule (RadioGroup or Select) - NEW section
   - Options: "One-time", "Daily", "Weekly", "Custom days"
   - When non-one-time selected: hide multi-day section
6. Multi-day Task (Collapsible) - NEW expandable
   - Only visible when recurring = "one-time"
   - Contains: End Date field
7. Start Time / End Time (Select x2) - unchanged position
```

### Pattern 1: Collapsible Expandable Section
**What:** Use Radix Collapsible for optional "Multi-day task" section
**When to use:** When hiding advanced options that most users don't need
**Example:**
```typescript
// Source: StudentHome.tsx pattern (lines 820-845)
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const [isMultiDayOpen, setIsMultiDayOpen] = useState(false);

<Collapsible open={isMultiDayOpen} onOpenChange={setIsMultiDayOpen}>
  <CollapsibleTrigger asChild>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-between text-muted-foreground hover:text-foreground"
    >
      <span>Multi-day task</span>
      <ChevronDown className={cn("w-4 h-4 transition-transform", isMultiDayOpen && "rotate-180")} />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="pt-2">
    <div className="space-y-2">
      <Label htmlFor="endDate">End Date</Label>
      <Input
        id="endDate"
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        min={dueDate} // Must be >= due date
        className="bg-card border-border"
      />
    </div>
  </CollapsibleContent>
</Collapsible>
```

### Pattern 2: Recurring Schedule Selector
**What:** Radio or button group for schedule type selection
**When to use:** For mutually exclusive options with visual feedback
**Example:**
```typescript
// Source: RecurringSchedules.tsx pattern (lines 260-300)
const SCHEDULE_OPTIONS = [
  { value: "once", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom days" },
];

// Option A: Select dropdown (compact)
<Select value={scheduleType} onValueChange={setScheduleType}>
  <SelectTrigger>
    <SelectValue placeholder="One-time task" />
  </SelectTrigger>
  <SelectContent>
    {SCHEDULE_OPTIONS.map((opt) => (
      <SelectItem key={opt.value} value={opt.value}>
        {opt.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// Option B: Button toggle group (more visual)
<div className="flex flex-wrap gap-2">
  {SCHEDULE_OPTIONS.map((opt) => (
    <Button
      key={opt.value}
      type="button"
      variant={scheduleType === opt.value ? "default" : "outline"}
      size="sm"
      onClick={() => setScheduleType(opt.value)}
      className={scheduleType === opt.value ? "bg-cta-primary hover:bg-cta-hover" : ""}
    >
      {opt.label}
    </Button>
  ))}
</div>
```

### Pattern 3: Day-of-Week Multi-Select (for "Custom days")
**What:** Toggle buttons for selecting specific weekdays
**When to use:** When schedule_type === "custom"
**Example:**
```typescript
// Source: RecurringSchedules.tsx (lines 280-300)
const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

{scheduleType === "custom" && (
  <div className="space-y-2">
    <Label>Days of Week</Label>
    <div className="flex flex-wrap gap-2">
      {DAYS_OF_WEEK.map((day) => (
        <Button
          key={day.value}
          type="button"
          variant={scheduleDays.includes(day.value) ? "default" : "outline"}
          size="sm"
          onClick={() => toggleDay(day.value)}
          className={scheduleDays.includes(day.value) ? "bg-cta-primary hover:bg-cta-hover" : ""}
        >
          {day.label}
        </Button>
      ))}
    </div>
  </div>
)}
```

### Anti-Patterns to Avoid
- **Don't keep both startDate and endDate visible by default:** The decision specifies a single Due Date with optional expansion
- **Don't show multi-day section when recurring is selected:** These are mutually exclusive per the context
- **Don't allow past dates for Due Date:** Validation must restrict to today and future only

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Expandable sections | Custom visibility toggle | Collapsible from @radix-ui | Handles animation, accessibility, keyboard navigation |
| Date validation | Custom comparison logic | HTML5 `min` attribute + date-fns | Browser handles past-date blocking natively |
| Schedule type selection | Custom toggle state | Existing Select or button pattern | Consistency with rest of app |
| Day-of-week selection | Custom checkbox logic | Existing toggleDayOfWeek pattern | Already implemented in RecurringSchedules.tsx |

**Key insight:** The codebase already has 90% of the patterns needed. The task is primarily reorganization and simplification, not new feature development.

## Common Pitfalls

### Pitfall 1: State Reset When Switching Schedule Types
**What goes wrong:** User sets an end date, switches to "daily", then back to "one-time" - end date state is stale
**Why it happens:** State persists across mode changes
**How to avoid:** Reset endDate when scheduleType changes to non-once value
**Warning signs:** Form submits with unexpected date range

### Pitfall 2: Date Comparison Timezone Issues
**What goes wrong:** Due date validation fails or allows past dates due to timezone offset
**Why it happens:** JS Date objects vs date strings comparison
**How to avoid:** Use string comparison for date-only values (format: "yyyy-MM-dd")
**Warning signs:** Users in different timezones see different behavior

### Pitfall 3: Forgetting to Update useAssignments Hook Interface
**What goes wrong:** Form sends new field names but hook expects old ones
**Why it happens:** Interface mismatch between form state and hook input
**How to avoid:** The `AssignGroupTaskInput` interface already uses `startDate`/`endDate` - map `dueDate` to `startDate`
**Warning signs:** Tasks not created, silent failures

### Pitfall 4: Collapsible Animation on First Render
**What goes wrong:** Section animates open when it should start closed
**Why it happens:** Initial state mismatch
**How to avoid:** Set `open={false}` initially, let user explicitly open
**Warning signs:** Form looks "jumpy" on load

### Pitfall 5: Multi-day Section Visible When Recurring Selected
**What goes wrong:** User sees both recurring options AND multi-day expansion
**Why it happens:** Forgot conditional rendering
**How to avoid:** `{scheduleType === "once" && <Collapsible>...</Collapsible>}`
**Warning signs:** Confusing UI with too many options visible

## Code Examples

Verified patterns from existing codebase:

### Date Field with Min Validation
```typescript
// Restrict to today and future dates
const today = format(new Date(), "yyyy-MM-dd");

<Input
  id="dueDate"
  type="date"
  value={dueDate}
  onChange={(e) => setDueDate(e.target.value)}
  min={today}  // HTML5 native validation
  className="bg-card border-border"
/>
```

### Conditional Section Visibility
```typescript
// Source: RecurringSchedules.tsx (lines 280-300)
// Hide multi-day when recurring, show day selector when custom
{scheduleType === "once" && (
  <Collapsible>...</Collapsible>
)}

{scheduleType === "weekly" && (
  <div className="space-y-2">
    <Label>Due Date becomes "Start from" date for recurring tasks</Label>
  </div>
)}

{scheduleType === "custom" && (
  <div>Day of week selector...</div>
)}
```

### Form State Initialization
```typescript
// Updated state for new form structure
const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
const [endDate, setEndDate] = useState(""); // Empty by default, only set if multi-day
const [scheduleType, setScheduleType] = useState<"once" | "daily" | "weekly" | "custom">("once");
const [scheduleDays, setScheduleDays] = useState<number[]>([]);
const [isMultiDayOpen, setIsMultiDayOpen] = useState(false);

// Reset derived state when schedule type changes
useEffect(() => {
  if (scheduleType !== "once") {
    setIsMultiDayOpen(false);
    // Keep endDate for "effective end" of recurring tasks
  }
  if (scheduleType !== "custom") {
    setScheduleDays([]);
  }
}, [scheduleType]);
```

### Mapping to Existing Hook
```typescript
// The assignGroupTask function expects startDate/endDate
// Map new form state to existing interface
const handleAssignTask = async () => {
  const result = await assignGroupTask({
    groupId: selectedGroupId,
    title: taskTitle.trim(),
    description: taskDescription.trim() || undefined,
    startDate: dueDate, // Due Date maps to startDate
    endDate: scheduleType === "once" && endDate ? endDate : dueDate, // Use endDate only if multi-day
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    // Note: recurring schedule may need hook extension for full support
  });
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Two visible date fields | Single Due Date + expandable | This phase | Simpler form for common case |
| No recurring option in quick assign | Recurring options inline | This phase | More powerful without complexity |

**Deprecated/outdated:**
- Separate Start Date / End Date as primary fields - replaced by single Due Date

## Open Questions

Things that couldn't be fully resolved:

1. **Recurring Schedule Backend Support**
   - What we know: `assignGroupTask` RPC function creates task instances for date range
   - What's unclear: Does it support schedule_type/schedule_days parameters?
   - Recommendation: Check if `assign_task_to_group` RPC needs extension, or if recurring should use `createAssignment` instead

2. **Label Change for Recurring: "Start from" vs "Due Date"**
   - What we know: Context says "Due Date becomes 'Start from' date for recurring tasks"
   - What's unclear: Should label dynamically change, or just add helper text?
   - Recommendation: Add helper text below field when recurring is selected: "Tasks will start from this date"

## Sources

### Primary (HIGH confidence)
- `/src/pages/AssignerDashboard.tsx` - Current form implementation
- `/src/hooks/useAssignments.ts` - Assignment creation logic
- `/src/components/ui/collapsible.tsx` - Collapsible component
- `/src/pages/RecurringSchedules.tsx` - Recurring schedule UI patterns
- `/src/pages/student/StudentHome.tsx` - Collapsible usage examples

### Secondary (MEDIUM confidence)
- `package.json` - Verified library versions

### Tertiary (LOW confidence)
- None - all findings based on codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already in codebase
- Architecture: HIGH - Patterns copied from existing code
- Pitfalls: HIGH - Based on code analysis and common React patterns

**Research date:** 2026-01-31
**Valid until:** 60 days (stable internal refactoring, no external dependencies)
