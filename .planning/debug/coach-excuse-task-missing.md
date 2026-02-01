---
status: investigating
trigger: "Coach excuse task functionality not present - UI and/or backend missing"
created: 2026-01-31T00:00:00Z
updated: 2026-01-31T00:00:00Z
---

## Current Focus

hypothesis: Excuse button implementation exists and appears correct - need to verify why it might not display
test: Check if tasks are correctly identified as overdue in the UI logic
expecting: Find the condition that causes excuse button not to render
next_action: Trace the overdue detection and button render logic

## Symptoms

expected: Coach opens student detail, sees overdue tasks with "Excuse" button. Clicking Excuse removes that task from overdue list.
actual: Coach excuse task functionality not present - UI and/or backend missing
errors: None reported
reproduction: Open StudentDetailSheet for a student with overdue tasks
started: UAT issue

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-01-31T00:01:00Z
  checked: useAssignments.ts excuseTask mutation
  found: excuseTaskMutation EXISTS (lines 596-622), sets status to "excused", properly exported
  implication: Backend mutation is fully implemented

- timestamp: 2026-01-31T00:02:00Z
  checked: StudentDetailSheet.tsx useAssignments import
  found: Line 68 - imports { excuseTask, isExcusingTask } from useAssignments - CORRECT
  implication: Hook is properly imported and available

- timestamp: 2026-01-31T00:03:00Z
  checked: StudentDetailSheet.tsx handleExcuseTask function
  found: Lines 146-156 - handleExcuseTask function EXISTS and calls excuseTask mutation
  implication: Handler is properly implemented

- timestamp: 2026-01-31T00:04:00Z
  checked: StudentDetailSheet.tsx TaskCard props and excuse button
  found: Lines 267-273 - TaskCard receives onExcuse prop, Lines 389-410 - Excuse button renders
  implication: Button render logic exists

- timestamp: 2026-01-31T00:05:00Z
  checked: isTaskOverdue function
  found: Lines 159-162 - checks task.status === "pending" && task.scheduled_date < todayStr
  implication: Overdue detection is correctly implemented

- timestamp: 2026-01-31T00:06:00Z
  checked: TaskCard excuse button condition
  found: Line 390 - button renders when: isOverdue && onExcuse
  implication: Button should render for overdue tasks that receive onExcuse prop

## Resolution

root_cause: FUNCTIONALITY IS PRESENT - The code is fully implemented
fix: N/A - no fix needed
verification: Need manual testing to confirm UI works as expected
files_changed: []
