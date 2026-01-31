# Phase 20: Task Rollover Logic - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Correct daily task visibility based on completion status and date. Tasks should appear, reset, and transition correctly at day boundaries. Students see today's tasks, overdue tasks, and yesterday's completed tasks (briefly). Coaches can see overdue status and excuse tasks.

</domain>

<decisions>
## Implementation Decisions

### Day Boundary Timing
- Use midnight in the student's browser/device timezone
- If student travels across timezones, adjust immediately to current device timezone
- Check day boundary in real-time (exact midnight)
- At midnight: completed tasks transition to "yesterday's completed" section with label
- "Yesterday's completed" section stays until dismissed via X button (only X button dismisses, not general interaction)
- Dismissal persists for the browser session, shared across tabs in the same browser
- Opening app after midnight shows brief recap of yesterday's completed tasks

### Yesterday's Completed Section
- Collapsed by default (shows summary like "3 tasks completed yesterday")
- Appears below today's tasks but above overdue
- Shows all of yesterday's completed tasks (not just recent hours)
- Separate section with labeled header
- Dismiss only via X button (instant removal)
- Once dismissed, gone for browser session (shared across tabs)

### Completion Reset Behavior
- Recurring tasks reset at midnight in student's timezone
- Missed recurring tasks appear in "Overdue" section with overdue indicator
- Overdue tasks never auto-clear (accumulate indefinitely)
- Students must complete overdue tasks to clear them (no skip/dismiss option)
- Collapse overdue list after 5 tasks ("and X more overdue..." expandable)
- Show original due date on each overdue task
- Sort overdue tasks newest-first (yesterday's at top)
- Weekly tasks (e.g., "every Monday") become overdue the next day (Tuesday) if missed
- One-time tasks get same overdue treatment as recurring

### Coach Overdue Visibility
- Coach sees overdue badge on student name in student list (count only, click to see details)
- Color escalation: yellow for 1-2, orange for 3-5, red for 6+ overdue
- Coach can excuse overdue tasks (mark as "excused")
- Excused tasks disappear from student's overdue list
- Student sees toast notification on next visit: "X tasks were excused by your coach" (combined if multiple)
- Toast dismisses automatically (1 day expiry on the notification)

### Task Visibility Rules
- Today's tasks show both incomplete and completed (completed stay mixed in place with strikethrough + muted styling)
- Completed tasks stay in original order position (don't sink to bottom)
- Tasks ordered by creation order (oldest assigned first)
- Overdue section appears below today's tasks
- No visibility of future days' tasks (only today and overdue)
- All tasks due today visible at midnight (no time-of-day gating)
- Labeled headers between sections: "Today's Tasks", "Overdue", "Yesterday's completed"
- Section order: Today → Overdue → Yesterday
- Empty state: generic "All done!" message when no today's tasks
- If only overdue exists (no today's tasks), skip the empty today message and just show overdue
- If only yesterday's completed exists, just show that section alone

### State Transitions & Edge Cases
- At midnight with app open: completed tasks move to yesterday section in real-time
- Students can uncheck (uncomplete) today's tasks
- Yesterday's completed section is read-only (no unchecking)
- New coach-assigned tasks appear immediately (real-time)
- If coach deletes a recurring task, clear all overdue instances immediately
- If coach modifies recurring task schedule, keep existing overdue but new schedule applies forward
- If student removed from group, clear all tasks (overdue and current) from that group
- If coach edits a completed task (name, description), reset to incomplete + notify student via toast
- On network reconnect: refresh state from server
- Completions require online connection (no offline sync)
- Failed completion: revert checkbox + error toast "Couldn't complete task. Try again."
- No offline indicator shown

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the implementation details (animations, exact styling, etc.).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 20-task-rollover-logic*
*Context gathered: 2026-01-31*
