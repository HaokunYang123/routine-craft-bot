---
status: diagnosed
phase: 20-task-rollover-logic
source: 20-01-SUMMARY.md, 20-02-SUMMARY.md, 20-03-SUMMARY.md, 20-04-SUMMARY.md, 20-05-SUMMARY.md
started: 2026-01-31T23:00:00Z
updated: 2026-01-31T23:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Task Sections Display
expected: Student dashboard shows Today's Tasks at top, then Overdue section (if any tasks from before today), then Yesterday section (if any completed tasks from yesterday). Each section is visually distinct.
result: fixed
reported: "overdue UI needs contrast, currently is all white which is hard to see"
severity: minor
fix_commit: 8fb82e2

### 2. Yesterday Section Collapsed by Default
expected: Yesterday section starts collapsed. Clicking header expands it to show completed tasks from yesterday.
result: skipped
reason: Cannot test without waiting a day for tasks to move to yesterday

### 3. Yesterday Section Dismissible
expected: Yesterday section has an X button. Clicking X hides the entire section for the session.
result: skipped
reason: Cannot test without waiting a day for tasks to move to yesterday

### 4. Yesterday Tasks Read-Only
expected: Completed tasks in Yesterday section show a checkmark icon but no interactive checkbox. You cannot uncheck them.
result: skipped
reason: Cannot test without waiting a day for tasks to move to yesterday

### 5. Overdue Section Collapses at 5+ Tasks
expected: If more than 5 overdue tasks exist, only first 5 show with "and X more overdue..." link. Clicking link expands to show all.
result: pass

### 6. Progress Bar Shows Today Only
expected: Progress bar/count at top shows only today's tasks (completed/total). Overdue and yesterday tasks don't affect the count.
result: pass

### 7. Coach Overdue Badge - Color Escalation
expected: In coach view, students with overdue tasks show a badge. Badge is yellow (1-2 overdue), orange (3-5), or red (6+).
result: issue
reported: "no we cant even see what task is assigned to the student"
severity: major

### 8. Coach Excuse Task
expected: Coach opens student detail, sees overdue tasks with "Excuse" button. Clicking Excuse removes that task from overdue list.
result: issue
reported: "not there, either the UI is not there or both the backend and UI is not there"
severity: major

### 9. Student Excused Notification
expected: When coach excuses a task, student sees a toast notification indicating the task was excused.
result: skipped
reason: Blocked by test 8 - excuse functionality not present

### 10. Cross-Tab Yesterday Dismissal Sync
expected: With two tabs open as student, dismissing Yesterday section in one tab also dismisses it in the other tab.
result: skipped
reason: Cannot test without waiting a day for tasks to move to yesterday

## Summary

total: 10
passed: 2
issues: 3
pending: 0
skipped: 5

## Gaps

- truth: "Each section is visually distinct with good contrast"
  status: fixed
  reason: "User reported: overdue UI needs contrast, currently is all white which is hard to see"
  severity: minor
  test: 1
  root_cause: "Overdue section lacks a background container - only has top border separator, no distinct background/border/shadow"
  artifacts:
    - path: "src/pages/student/StudentHome.tsx"
      issue: "Lines 856-1035: Overdue section has no visual container wrapper"
  fix_commit: "8fb82e2"
  fix_description: "Wrapped overdue section in bg-red-50 container with border-red-200 rounded-lg p-4"

- truth: "Coach can see tasks assigned to students with overdue badge"
  status: needs_reverification
  reason: "User reported: no we cant even see what task is assigned to the student"
  severity: major
  test: 7
  root_cause: "Code is complete and correct - badges only appear when overdue tasks exist (scheduled_date < today, status = 'pending'). Likely data/test setup issue."
  artifacts:
    - path: "src/components/groups/GroupReviewCard.tsx"
      issue: "Lines 184-193: Badge rendering exists with correct color escalation"
    - path: "src/hooks/useAssignments.ts"
      issue: "Lines 685-718: getGroupProgress correctly queries and returns overdueCount"
    - path: "src/pages/CoachDashboard.tsx"
      issue: "Lines 128-140: Data mapping is correct"
  missing:
    - "Verify test data has tasks with scheduled_date < today AND status = 'pending'"
  debug_session: ".planning/debug/coach-overdue-badge-visibility.md"

- truth: "Coach can excuse overdue tasks via Excuse button in student detail"
  status: needs_reverification
  reason: "User reported: not there, either the UI is not there or both the backend and UI is not there"
  severity: major
  test: 8
  root_cause: "Functionality IS FULLY IMPLEMENTED - excuseTask mutation exists (lines 596-637), UI exists (lines 389-410). Button only shows for tasks where status='pending' AND scheduled_date < today."
  artifacts:
    - path: "src/hooks/useAssignments.ts"
      issue: "Lines 596-637: excuseTask mutation fully implemented"
    - path: "src/components/dashboard/StudentDetailSheet.tsx"
      issue: "Lines 389-410: Excuse button renders for overdue tasks"
  missing:
    - "Re-verify with tasks that have status='pending' AND scheduled_date before today"
  debug_session: ".planning/debug/coach-excuse-task-missing.md"
