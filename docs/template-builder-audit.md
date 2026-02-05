# Template Builder Audit (Read-Only)

Date: 2026-02-05  
Scope: template library tab + manual template builder implementation, schema, assignment integration, and related imports/usages.

## 1) Files handling template library tab and manual template builder

### Primary files (directly implement the feature)

- `src/pages/Templates.tsx`
  - Main Template Library page.
  - Hosts tabs: `AI Builder`, `Manual Builder`, `Library`.
  - Renders `ManualTemplateBuilder` and `AIPlanBuilder`.
  - Contains inline dialogs for save/preview/edit (no separate modal file).
- `src/components/templates/ManualTemplateBuilder.tsx`
  - Manual template builder UI and form state.
  - Defines per-task fields, validation, save payload.
- `src/hooks/useTemplates.ts`
  - Reads/writes `templates` and `template_tasks` from Supabase.
  - Used by `Templates.tsx` for list/create/update/delete.

### Supporting files (part of the same page flow)

- `src/components/ai/AIPlanBuilder.tsx`
  - AI tab builder on the same page.
- `src/components/skeletons/TemplatesSkeleton.tsx`
  - Loading skeleton for `Templates.tsx`.
- `src/App.tsx`
  - Route registration for templates page (`/dashboard/templates`).

### Modal structure note

- There is no standalone template modal file under `src/components/...` for Templates page.
- Modals are inline `Dialog` blocks inside `src/pages/Templates.tsx`:
  - Save Template dialog
  - Preview Template dialog
  - Edit Template dialog

## 2) Manual builder details

### Current UI structure

From `src/components/templates/ManualTemplateBuilder.tsx`:

- Template-level section:
  - `Template Name *` (required)
  - `Description (optional)`
- Task list section:
  - Add/remove tasks
  - Per-task card with:
    - `Task Title *`
    - `Day`
    - `Duration`
    - `Priority`
    - `Description (optional)`
    - `Due Time`
    - `Start Time`
    - `End Time`
- Preview summary section (derived stats)
- Save button

Validation:

- Save is enabled only when:
  - template name is non-empty, and
  - at least one task has a non-empty title.

### Per-task form fields (manual builder)

- `title`: string, required.
- `description`: string, optional.
- `duration_minutes`: number, optional in type but effectively expected in UI (defaults to `15`).
- `day_offset`: number, required (defaults to `0`).
- `priority`: `"low" | "medium" | "high"`, optional in type (defaults to `"medium"`).
- `due_time_offset_minutes`: number, optional (`undefined` means all-day).
- `start_time`: string, optional.
- `end_time`: string, optional.
- `time`: optional field exists in TypeScript interface but is not rendered/used in the form.

### Radix Select usage and `<SelectItem value>` values

From `src/components/templates/ManualTemplateBuilder.tsx`:

1. Day Select
- Values: `"0"`, `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, `"6"`

2. Priority Select
- Values: `"low"`, `"medium"`, `"high"`

3. Due Time Select
- Values:
  - `""` for `All day`
  - plus `TIME_SLOTS.map(slot.value.toString())`
  - `TIME_SLOTS` comes from `generateTimeSlots()` (5:00 AM to 10:00 PM, 30-min increments; numeric minute offsets)

4. Start Time Select
- Values:
  - `""` for `None`
  - plus `TIME_SLOTS.map(slot.label)` (e.g. `"05:00 AM"` ... `"10:00 PM"`)

5. End Time Select
- Values:
  - `""` for `None`
  - plus filtered `TIME_SLOTS.map(slot.label)` values after selected start time

### Empty string `SelectItem` values (crash source)

In `src/components/templates/ManualTemplateBuilder.tsx`, these use `value=""`:

- `Due Time` -> `All day`
- `Start Time` -> `None`
- `End Time` -> `None`

These are the current empty-string SelectItem definitions in manual builder.

### Route path for template builder

- Route file: `src/App.tsx`
- Path: `/dashboard/templates`
- Manual builder is a tab inside that page (`value="manual"`), not a separate route.

## 3) Supabase schema for templates

Source references:

- `src/integrations/supabase/types.ts`
- `supabase/migrations/20260119000001_template_preassignment.sql`
- `supabase/migrations/20260201000001_add_template_task_scheduling.sql`

### `templates` table (current generated schema)

- `id`: uuid
- `coach_id`: uuid
- `name`: text
- `description`: text, nullable
- `created_at`: timestamptz, nullable
- `updated_at`: timestamptz, nullable
- `category`: text, nullable
- `duration_weeks`: integer, nullable
- `frequency_per_week`: integer, nullable
- `is_ai_generated`: boolean, nullable
- `tags`: text[], nullable
- `weeks`: json/jsonb, nullable

### `template_tasks` table (current generated schema)

- `id`: uuid
- `template_id`: uuid (FK -> templates.id)
- `title`: text
- `description`: text, nullable
- `duration_minutes`: integer, nullable
- `day_offset`: integer
- `sort_order`: integer, nullable
- `created_at`: timestamptz, nullable
- `due_time_offset_minutes`: integer, nullable
- `start_time`: text, nullable
- `end_time`: text, nullable

### Related template-linked columns in other tables

- `assignments.template_id` (uuid, nullable, FK -> templates.id)
- `class_sessions.default_template_id` (uuid, nullable, FK -> templates.id)
- `recurring_schedules.template_id` (uuid, nullable, FK -> templates.id)

## 4) `AssignTaskModal.tsx` task field structure

File: `src/components/assignments/AssignTaskModal.tsx`

### Form fields and requirements

- `Use Template` (Select)
  - Type: string (`"none"` or template id)
  - Required: optional
- `Task Title`
  - Type: string
  - Required: yes
- `Description`
  - Type: string
  - Required: optional
- `Assign Date`
  - Type: date string (`yyyy-MM-dd`)
  - Required: yes
- `Due Date`
  - Type: date string (`yyyy-MM-dd`)
  - Required: yes
- `Schedule`
  - Type: enum (`once | daily | weekly | monthly | custom`)
  - Required: yes (defaults to `once`)
- `Day of Month` (monthly only)
  - Type: number (`1..31` or `-1` for last day)
  - Required: conditional (required when schedule is monthly)
- `Days of Week` (custom only)
  - Type: number[] (`0..6`)
  - Required: conditional (at least one day required when schedule is custom)
- `Start Time`
  - Type: string
  - Required: optional
- `End Time`
  - Type: string
  - Required: optional
  - Constraint: if both start/end provided, end must be after start

### Submission gating in modal

Submit button is disabled when:

- title is empty, or
- assign/due date missing, or
- validation has `timeError`, or
- custom schedule with no selected days, or
- request in-flight.

## 5) Existing template -> `task_instances` conversion logic

Yes, conversion logic exists.

### Primary conversion path

- File: `src/hooks/useAssignments.ts`
- Function: `createAssignment(...)`
- Behavior when `template_id` is provided:
  - fetches template tasks from `template_tasks`
  - maps each task using `day_offset`
  - creates `task_instances` for each assignee on `start_date + day_offset`
  - inserts rows into `task_instances`

### Additional related behavior

- `src/components/assignments/AssignTaskModal.tsx`
  - loads template tasks and pre-fills title/description/start/end from first template task
  - writes `template_id` onto assignment record in some flows
  - group one-time flow uses RPC `assign_task_to_group` (does not itself expand all template tasks here)

### DB trigger history (legacy path)

- `supabase/migrations/20260119000001_template_preassignment.sql`
- `supabase/migrations/20260201000002_update_template_assignment_trigger.sql`
- Function `assign_template_tasks_on_join()` exists, but inserts into `tasks` table on student join to class session (legacy pre-`task_instances` architecture path).

## 6) Other components/hooks importing from or related to templates

### Direct template hook consumers

- `src/pages/People.tsx` (`useTemplates`)
- `src/pages/RecurringSchedules.tsx` (`useTemplates`)

### Other template-related integration points

- `src/components/assignments/AssignTaskModal.tsx` (loads templates/template_tasks for assignment UI)
- `src/hooks/useRecurringSchedules.ts` (enriches recurring schedules with template names)
- `src/pages/Tasks.tsx` (disconnected page, still contains template assignment logic)
- `src/components/dashboard/CoachSidebar.tsx` (Templates nav link)
- `src/pages/AssignerDashboard.tsx` (quick link to `/dashboard/templates`)
- `src/hooks/useTemplates.test.tsx` (tests for template hook behavior)

## Additional note: empty-string Radix Select usage elsewhere

Not part of manual builder only; additional empty-string SelectItem values also exist in:

- `src/pages/RecurringSchedules.tsx` (`No template`, `All classes`, `All students`)

This matches the same pattern that previously caused the Radix Select crash when `value=""` is used.
