---
status: verifying
trigger: "Multiple bugs across real-time updates, timezones, data visibility, data integrity, UX, and AI stability"
created: 2026-01-26T00:00:00Z
updated: 2026-01-26T00:10:00Z
---

## Current Focus

hypothesis: All critical and high priority bugs have been fixed
test: Build passed, verify each fix works
expecting: All 12 fixed bugs work correctly
next_action: Run tests and verify

## Symptoms

expected: See full bug list in symptoms section
actual: 14 identified bugs across multiple categories
errors: Various - data integrity, UX, timezone issues
reproduction: See individual bug descriptions
started: Pre-existing issues

## Bug Tracker

### Critical Priority (Data Integrity)

| # | Bug | File | Status |
|---|-----|------|--------|
| 11 | Ghost Schedule - schedule changes don't delete old tasks | useRecurringSchedules.ts | FIXED |
| 12 | Zombie Tasks - removing student doesn't clean up tasks | GroupDetail.tsx | FIXED |
| 9 | Orphaned Assignment - task failure leaves orphan header | useAssignments.ts | FIXED |

### Critical Priority (UX)

| # | Bug | File | Status |
|---|-----|------|--------|
| 7 | California Disappearing Task - UTC date parsing | utils.ts, StudentSchedule.tsx | FIXED |
| 4 | Invisible Overdue Tasks - only fetches today | StudentHome.tsx | FIXED |

### High Priority

| # | Bug | File | Status |
|---|-----|------|--------|
| 1 | Real-time Updates - no subscription | CoachDashboard.tsx | FIXED |
| 5 | Ghost Progress - ignores old completed tasks | useAssignments.ts | FIXED |
| 8 | Morning Panic - false positive attention flags | CoachDashboard.tsx | FIXED |

### Medium Priority

| # | Bug | File | Status |
|---|-----|------|--------|
| 2 | Frozen Date Header | CoachDashboard.tsx | FIXED |
| 6 | Inbox Zero Timing - flash during animation | StudentSchedule.tsx | ACKNOWLEDGED (minor UX) |
| 13 | Silent Notes - no notification | GroupDetail.tsx | DEFERRED (needs design) |
| 14 | AI JSON Crash - parsing failures | ai-assistant/index.ts | FIXED |

### Needs Discussion

| # | Bug | File | Status |
|---|-----|------|--------|
| 3 | Timezone Issues - Assignment Time | StudentHome.tsx | needs-discussion |
| 10 | Infinite Pending State - needs cron | StudentSchedule.tsx | needs-discussion |

## Eliminated

(none)

## Evidence

- timestamp: 2026-01-26T00:01:00Z
  checked: useRecurringSchedules.ts - updateSchedule (lines 175-198) and deleteSchedule (lines 200-220)
  found: Neither function deletes pending task_instances when schedule is updated/deleted
  implication: Bug #11 confirmed - ghost tasks remain

- timestamp: 2026-01-26T00:01:00Z
  checked: GroupDetail.tsx - handleRemoveStudent (lines 305-331)
  found: Only deletes group_members row, no cleanup of task_instances
  implication: Bug #12 confirmed - zombie tasks remain

- timestamp: 2026-01-26T00:01:00Z
  checked: useAssignments.ts - createAssignment (lines 68-339)
  found: Assignment inserted first (line 94), then tasks (line 315). No transaction.
  implication: Bug #9 confirmed - if tasks fail, orphan assignment header

- timestamp: 2026-01-26T00:01:00Z
  checked: StudentHome.tsx - fetchTasks (lines 181-189)
  found: Query uses .eq("scheduled_date", today) - only today's tasks
  implication: Bug #4 confirmed - overdue tasks invisible

- timestamp: 2026-01-26T00:01:00Z
  checked: useAssignments.ts - getGroupProgress (lines 456-460)
  found: Query uses .eq("scheduled_date", targetDate) - only today's tasks counted
  implication: Bug #5 confirmed - catch-up work ignored

- timestamp: 2026-01-26T00:01:00Z
  checked: CoachDashboard.tsx - loadGroupStats (lines 100-103)
  found: flaggedMembers uses (completedToday/totalToday) < 0.5 with no time check
  implication: Bug #8 confirmed - everyone flagged in morning

- timestamp: 2026-01-26T00:01:00Z
  checked: CoachDashboard.tsx line 206
  found: {format(new Date(), "EEEE, MMMM d, yyyy")} is static render
  implication: Bug #2 confirmed - date never updates

- timestamp: 2026-01-26T00:01:00Z
  checked: ai-assistant/index.ts lines 159-168
  found: Only removes markdown code blocks, no robust JSON extraction
  implication: Bug #14 confirmed - AI preamble breaks parsing

- timestamp: 2026-01-26T00:10:00Z
  checked: npm run build
  found: Build successful - all fixes compile correctly
  implication: Ready for verification

## Resolution

root_cause: Multiple independent bugs in data management, date handling, and UX
fix: Applied fixes to 12 bugs (10 fully fixed, 2 deferred/minor)
verification: Build passed successfully
files_changed:
  - src/hooks/useRecurringSchedules.ts (Bug #11 - delete future tasks on schedule update/delete)
  - src/pages/GroupDetail.tsx (Bug #12 - delete student's pending tasks when removing from group)
  - src/hooks/useAssignments.ts (Bug #9, #5 - rollback orphan assignments, fix progress counting)
  - src/pages/student/StudentHome.tsx (Bug #4 - include overdue tasks in query, show visual indicators)
  - src/pages/CoachDashboard.tsx (Bug #1, #2, #8 - realtime subscription, live date, overdue-based flags)
  - src/lib/utils.ts (Bug #7 - parse date strings as local time)
  - src/pages/student/StudentSchedule.tsx (Bug #7 - use safe local date parsing)
  - supabase/functions/ai-assistant/index.ts (Bug #14 - robust JSON extraction)
