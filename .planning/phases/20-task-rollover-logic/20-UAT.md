---
status: complete
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
result: issue
reported: "overdue UI needs contrast, currently is all white which is hard to see"
severity: minor

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
  status: failed
  reason: "User reported: overdue UI needs contrast, currently is all white which is hard to see"
  severity: minor
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Coach can see tasks assigned to students with overdue badge"
  status: failed
  reason: "User reported: no we cant even see what task is assigned to the student"
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Coach can excuse overdue tasks via Excuse button in student detail"
  status: failed
  reason: "User reported: not there, either the UI is not there or both the backend and UI is not there"
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
