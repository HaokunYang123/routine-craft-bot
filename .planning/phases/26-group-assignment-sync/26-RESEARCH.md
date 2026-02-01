# Phase 26 Research: Group Assignment Sync

**Analysis Date:** 2026-01-31
**Phase Goal:** Group assignment ("green button") has same scheduling features as custom tasks

## Current State Analysis

### Where Group Assignment Lives

**GroupDetail.tsx** (`/Users/.../src/pages/GroupDetail.tsx`)
- Shows group roster, notes, stats
- **Does NOT have task assignment UI currently**
- No "Assign Task" button found on this page

**AssignerDashboard.tsx** (`/Users/.../src/pages/AssignerDashboard.tsx`)
- Main task assignment interface for coaches
- Has full scheduling UI implemented in Phase 24
- Includes: assign date, due date, time blocks, monthly recurring
- Uses `assignGroupTask()` hook to assign to groups

### Current Group Assignment Flow

**Path:** AssignerDashboard → Select Group → Assign Task

**Hook:** `useAssignments.ts` → `assignGroupTask()`
- Accepts: `AssignGroupTaskInput` interface (lines 73-83)
- Interface already has ALL Phase 24 fields:
  - `assignDate` (visibility date)
  - `dueDate` (deadline)
  - `startTime` / `endTime` (time blocks)
  - `scheduleType` (once/daily/weekly/monthly/custom)
  - `scheduleDays` (day picker)

**RPC:** `assign_task_to_group` (Supabase function)
- Created in Phase 24-01 (migration `20260131000001_add_scheduling_columns.sql`)
- Accepts all scheduling parameters
- Creates task_instances with new columns

**Database Schema:**
- `task_instances` table has Phase 24 columns:
  - `assign_date` (DATE)
  - `start_time` (TEXT)
  - `end_time` (TEXT)
  - `scheduled_date` (DATE - due date)

## Gap Analysis

### What Works (Phase 24 Complete)

✅ **Backend:** Database schema supports all features
✅ **Hook:** `assignGroupTask()` accepts all parameters
✅ **RPC:** `assign_task_to_group` handles all scheduling
✅ **UI (AssignerDashboard):** Full scheduling interface exists

### What's Missing

❌ **GroupDetail page:** No task assignment button at all
❌ **Consistency:** Group assignment UI doesn't match custom task UI
❌ **Features:** Groups can't use assign/due dates, time blocks, monthly recurring from group detail view

## Requirements Mapping

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| GRP-01: "Assign Task" button uses same improved UI | No button on GroupDetail | Need to add assignment UI to GroupDetail |
| GRP-02: Group assignment supports assign date + due date | Backend ready, UI missing | Wire UI to hook params |
| GRP-03: Group assignment supports time blocks | Backend ready, UI missing | Wire UI to hook params |
| GRP-04: Group assignment supports all recurring options | Backend ready, UI missing | Wire UI to hook params |

## Discovery Level Assessment

**Level:** 0 - Skip

**Reasoning:**
- Phase 24 already implemented the entire scheduling system
- AssignerDashboard has working reference UI
- `assignGroupTask()` hook signature matches Phase 24 patterns
- This is pure UI consistency work - copying existing patterns to GroupDetail page

**Patterns established in Phase 24:**
- Assign date / due date separation (24-01, 24-02)
- Time block UI (start/end time selectors) (24-02)
- Monthly recurring with day picker (24-02)
- Form validation (end time > start time) (24-02)
- RPC parameter mapping (24-01, 24-02)

## Architecture Decision

### Option A: Add Assignment Dialog to GroupDetail (RECOMMENDED)

**Approach:**
- Add "Assign Task" button to GroupDetail header
- Dialog with same form fields as AssignerDashboard
- Pre-fill `groupId` from URL params
- Reuse existing `assignGroupTask()` hook

**Pros:**
- Consistent with AssignerDashboard patterns
- Single source of truth for assignment logic
- Coach can assign directly from group view (better UX)
- No need to navigate back to AssignerDashboard

**Cons:**
- Duplicate UI code (dialog form exists in two places)

**Mitigation:** Extract shared form component if duplication becomes maintenance burden

### Option B: Refactor AssignerDashboard as Shared Component

**Approach:**
- Extract assignment form to shared component
- Import into both AssignerDashboard and GroupDetail

**Pros:**
- DRY - no code duplication
- Single form maintains consistency

**Cons:**
- Larger refactor scope
- AssignerDashboard has additional state (student lists, notes)
- Risk of over-abstracting

**Decision:** Option A for Phase 26. Extract shared component in future refactor if needed.

## Implementation Strategy

### Plan 26-01: Add Group Assignment UI to GroupDetail

**Scope:**
1. Add "Assign Task" button to GroupDetail header (next to "Delete Group")
2. Create assignment dialog matching AssignerDashboard form
3. Wire dialog to `assignGroupTask()` hook with all Phase 24 parameters
4. Form fields:
   - Task title (required)
   - Task description (optional)
   - Assign date (default: today)
   - Due date (default: today, auto-adjust if < assign date)
   - Time block: start time + end time (optional)
   - Schedule type: once/daily/weekly/monthly/custom
   - Monthly: day picker (1-31 + "Last day")
   - Custom: day-of-week picker
5. Form validation matching AssignerDashboard
6. Success toast + data refresh
7. Human verification checkpoint (test assign task flow)

**Files Modified:**
- `src/pages/GroupDetail.tsx` (add dialog + button + state + handler)

**Dependencies:**
- Phase 24 (database schema, hook, RPC)
- No new packages needed

**Context Budget:** ~40% (single file, copying existing patterns)

**Wave:** 1 (no dependencies)

## Standard Stack (from Phase 24)

**UI Libraries:**
- shadcn/ui Dialog, Button, Input, Textarea, Select, Label
- date-fns for date formatting

**Form State:**
- React useState hooks (matching AssignerDashboard pattern)
- No react-hook-form needed (simple form)

**Validation:**
- Inline validation (title required, end time > start time)
- Auto-adjust due date when assign date moves later

**Data Layer:**
- `useAssignments()` hook
- `assignGroupTask()` function
- React Query cache invalidation (handled by hook)

## Don't Hand-Roll

❌ Date picker widget (use native `<input type="date">`)
❌ Time validation logic (copy from AssignerDashboard)
❌ RPC call logic (use hook)
❌ Schedule date calculation (already in RPC)

✅ Reuse AssignerDashboard form structure
✅ Reuse existing validation functions
✅ Reuse existing state management patterns

## Common Pitfalls

**Pitfall 1:** Forgetting to pre-fill `groupId`
- **Fix:** Extract from URL params, pass to `assignGroupTask()`

**Pitfall 2:** Missing form reset after successful assignment
- **Fix:** Call reset function in onSuccess callback

**Pitfall 3:** Not invalidating queries after assignment
- **Fix:** Hook already handles this via React Query onSuccess

**Pitfall 4:** Inconsistent field names between UI and hook
- **Fix:** Follow exact naming from `AssignGroupTaskInput` interface (assignDate, dueDate, startTime, endTime, scheduleType, scheduleDays)

**Pitfall 5:** Monthly day picker not showing -1 for "Last day"
- **Fix:** Copy exact pattern from AssignerDashboard lines 113-114

## Success Criteria

**Must be TRUE:**
1. GroupDetail page has "Assign Task" button in header
2. Button opens dialog with all scheduling fields
3. Assigned tasks use separate assign/due dates
4. Time blocks display correctly on student schedule
5. Monthly recurring option works with day picker
6. Form validation prevents invalid states

**Test Cases:**
1. Assign once task with assign date = today, due date = tomorrow
2. Assign daily task with time block "9:00 AM - 10:00 AM"
3. Assign monthly task on 15th of month
4. Assign monthly task on "Last day" of month
5. Assign custom task on Mon/Wed/Fri
6. Verify all tasks appear on student schedule with correct dates/times

---

**Research complete. Ready for planning.**
