---
phase: 26-group-assignment-sync
verified: 2026-01-31T23:59:00Z
status: gaps_found
score: 3/6 must-haves verified
gaps:
  - truth: "Assignment dialog shows monthly recurring option with day picker"
    status: verified
    reason: "UI exists but functionality incomplete - scheduleType/scheduleDays not sent to backend"
    artifacts:
      - path: "src/pages/GroupDetail.tsx"
        issue: "Monthly UI present but scheduleType/scheduleDays parameters not passed to RPC"
      - path: "src/hooks/useAssignments.ts"
        issue: "assignGroupTask function does not pass scheduleType or scheduleDays to RPC"
      - path: "supabase/migrations/20260131000001_add_scheduling_columns.sql"
        issue: "assign_task_to_group RPC only accepts assign/due dates and time blocks, no recurring parameters"
    missing:
      - "Update assign_task_to_group RPC to accept p_schedule_type and p_schedule_days parameters"
      - "Update RPC implementation to create multiple task instances for recurring schedules"
      - "Update useAssignments.assignGroupTaskMutation to pass scheduleType and scheduleDays to RPC"
  - truth: "Assigned group tasks appear on student schedule with correct dates"
    status: partial
    reason: "Works for one-time tasks, untested for recurring (monthly/daily/weekly/custom)"
    artifacts:
      - path: "supabase/migrations/20260131000001_add_scheduling_columns.sql"
        issue: "RPC hardcodes schedule_type to 'once' (line 114), ignoring recurring options"
    missing:
      - "Test recurring group tasks on student schedule once backend support is added"
  - truth: "Time blocks display as 'HH:MM AM/PM - HH:MM AM/PM' format"
    status: partial
    reason: "Backend stores time blocks, frontend display not verified in student schedule view"
    artifacts: []
    missing:
      - "Verify student schedule renders time blocks from group assignments correctly"
---

# Phase 26: Group Assignment Sync Verification Report

**Phase Goal:** Group assignment ("green button") has same scheduling features as custom tasks  
**Verified:** 2026-01-31T23:59:00Z  
**Status:** gaps_found  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Coach can click 'Assign Task' button on GroupDetail page | ✓ VERIFIED | Button exists at line 596-600 with Plus icon and correct styling |
| 2 | Assignment dialog shows assign date and due date fields | ✓ VERIFIED | Dialog at lines 952-986 has both fields with helper text |
| 3 | Assignment dialog shows time block fields (start time + end time) | ✓ VERIFIED | Time selectors at lines 1085-1116 with TIME_SLOTS integration |
| 4 | Assignment dialog shows monthly recurring option with day picker | ✗ FAILED | **UI EXISTS but NOT FUNCTIONAL** - scheduleType/scheduleDays collected (lines 254-265) but NOT passed to backend |
| 5 | Assigned group tasks appear on student schedule with correct dates | ⚠️ PARTIAL | Works for one-time tasks; recurring untested (backend doesn't support it) |
| 6 | Time blocks display as 'HH:MM AM/PM - HH:MM AM/PM' format | ⚠️ PARTIAL | Backend stores correctly; student schedule display not verified |

**Score:** 3/6 truths verified (3 verified, 1 failed, 2 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/pages/GroupDetail.tsx` | Group task assignment UI with Phase 24 features | ✓ SUBSTANTIVE | 1154 lines, has all UI elements (button, dialog, form fields, validation) |
| `src/hooks/useAssignments.ts` | assignGroupTask function | ⚠️ PARTIAL | Function exists (line 583) but missing scheduleType/scheduleDays parameters in RPC call |
| `supabase/migrations/20260131000001_add_scheduling_columns.sql` | assign_task_to_group RPC | ⚠️ PARTIAL | RPC exists but only supports one-time tasks (hardcoded 'once' on line 114) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| GroupDetail.tsx | useAssignments hook | assignGroupTask call | ✓ WIRED | Line 254 calls assignGroupTask with all form data |
| useAssignments.assignGroupTask | assign_task_to_group RPC | supabase.rpc() | ⚠️ PARTIAL | **WIRING GAP**: Hook receives scheduleType/scheduleDays but doesn't pass to RPC (lines 552-560) |
| assign_task_to_group RPC | task_instances table | INSERT statement | ✓ WIRED | RPC creates task instances (lines 125-150) |

**Critical Wiring Gap Found:** The data flow is broken at the hook → RPC boundary. GroupDetail.tsx correctly collects recurring schedule options, but useAssignments.ts drops these parameters before calling the RPC function. The RPC function doesn't accept them either.

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| GRP-01: "Assign Task" button uses updated scheduling UI | ✓ SATISFIED | None - button present with full dialog |
| GRP-02: Group assignment supports assign date + due date | ✓ SATISFIED | None - both dates working end-to-end |
| GRP-03: Group assignment supports time blocks | ✓ SATISFIED | None - start/end time working |
| GRP-04: Group assignment supports all recurring options | ✗ BLOCKED | **Backend doesn't support recurring** - RPC only creates one-time tasks |

**Requirements Score:** 3/4 satisfied

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/useAssignments.ts` | 552-560 | Parameters collected but not used | 🛑 Blocker | Monthly/recurring UI is non-functional |
| `supabase/migrations/20260131000001_add_scheduling_columns.sql` | 114 | Hardcoded 'once' schedule_type | 🛑 Blocker | All group tasks are one-time only |
| `src/pages/GroupDetail.tsx` | 254-265 | scheduleType/scheduleDays passed but ignored by backend | ⚠️ Warning | Misleading UI - users think recurring works |

### Gaps Summary

**Phase Goal Achievement: INCOMPLETE**

The phase goal was "Group assignment has same scheduling features as custom tasks." Current state:

**Working:**
- ✓ Assign Date + Due Date separation
- ✓ Time blocks (start time + end time)
- ✓ UI for Monthly/Daily/Weekly/Custom options

**NOT Working:**
- ✗ Monthly recurring (UI exists, backend ignores it)
- ✗ Daily recurring (UI exists, backend ignores it)
- ✗ Weekly recurring (UI exists, backend ignores it)
- ✗ Custom day-of-week recurring (UI exists, backend ignores it)

**Root Cause:**

The implementation stopped at the UI layer. The data flow breaks between useAssignments hook and the RPC function:

1. **GroupDetail.tsx (Frontend)** - Collects all schedule options ✓
2. **useAssignments.ts (Hook)** - Receives schedule options but doesn't pass to RPC ✗
3. **assign_task_to_group (RPC)** - Doesn't accept schedule parameters ✗
4. **Database** - Only creates one task instance per student ✗

**What needs to happen:**

1. Update `assign_task_to_group` RPC signature to accept `p_schedule_type` and `p_schedule_days` parameters
2. Update RPC logic to calculate recurrence dates (like `getScheduledDates` in useAssignments.ts)
3. Update RPC to create multiple task instances for recurring schedules
4. Update `useAssignments.assignGroupTaskMutation` to pass scheduleType/scheduleDays to RPC
5. Test monthly recurring group task on student schedule

**Feature Parity Analysis:**

Custom tasks (AssignerDashboard) support:
- ✓ Assign/due dates
- ✓ Time blocks  
- ✓ Monthly recurring (createAssignment hook + getScheduledDates helper)

Group tasks (GroupDetail) support:
- ✓ Assign/due dates
- ✓ Time blocks
- ✗ Monthly recurring (UI only, no backend implementation)

**Gap: Recurring schedules not implemented for group assignments.**

---

_Verified: 2026-01-31T23:59:00Z_  
_Verifier: Claude (gsd-verifier)_
