# Phase 21: Task Assignment Cleanup - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Simplify the custom task assignment form by consolidating duplicate date fields into a single "Due Date" field, while preserving recurring schedule functionality and optional time windows. The form in AssignerDashboard.tsx is the primary target.

</domain>

<decisions>
## Implementation Decisions

### Single Date Field Design
- Replace separate "Start Date" / "End Date" with a single "Due Date" field
- Label: "Due Date"
- Default value: Today
- Restrict to today and future dates only (no past dates)
- Optional "Multi-day task" expandable section reveals an "End Date" field when coach needs a date range
- When collapsed, task applies to the single due date only

### Time Field Handling
- Keep both "Start Time" and "End Time" fields
- Keep current labels: "Start Time" / "End Time"
- Visible by default (not hidden in expandable section)
- No default values — empty by default, coach selects when needed
- Validation: End time must be after start time (already exists)

### Form Field Order
1. Group (select)
2. Task Title (required)
3. Description (optional)
4. Due Date (required, defaults to today)
5. Recurring schedule options (daily, weekly, custom days)
6. "Multi-day task" expandable section (hidden when recurring is selected)
7. Start Time / End Time (side by side)

### Recurring Schedule Interaction
- Due Date becomes "Start from" date for recurring tasks
- Available options: Daily, Weekly, Custom days (specific weekdays)
- When recurring is selected, hide the "Multi-day task" expandable section
- Recurring options appear immediately after Due Date, before multi-day section

### Claude's Discretion
- Exact styling of the expandable "Multi-day task" section
- How the recurring schedule selector is implemented (dropdown, radio, etc.)
- Whether to show a summary of the recurrence pattern
- Error message wording for validation failures

</decisions>

<specifics>
## Specific Ideas

- The current form has startDate + endDate both defaulting to today — this feels redundant for most tasks
- Keep the form minimal for the common case (single day task) while allowing advanced options when needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-task-assignment-cleanup*
*Context gathered: 2026-01-31*
