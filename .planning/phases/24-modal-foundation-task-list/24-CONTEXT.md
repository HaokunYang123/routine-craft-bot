# Phase 24: Modal Foundation + Task List - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Core modal shell with compact task list for creating multiple tasks with inline editing. Coaches can add, edit, delete, and reorder tasks. Defaults section, progressive disclosure accordion, and templates are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Modal layout & header
- Medium centered modal (~500-600px wide), vertically centered with padding
- Header shows "Assign Tasks to [Name]" with student or group name in title
- Brief explanatory subtext below header (e.g., "Add tasks below. Set due date and schedule in Defaults.")
- Close X button in top-right corner; clicking outside modal also closes

### Task row design
- Each compact row shows: title input, expand icon (chevron), delete X button
- Title shows as text, click to turn into editable input field
- No status indicators or badges on rows — keep them clean
- Placeholder text: "Task title"

### Add/delete interactions
- "+ Add Task" button sits below the task list
- Modal opens with one empty task row already present, title focused, ready to type
- Click X to delete immediately — no confirmation dialog
- Coach can delete all tasks (empty list allowed); Assign button disabled until at least one task has content

### Drag-and-drop reordering
- Six-dot grip handle always visible on left side of each row
- Drop indicator line (blue) shows where task will land during drag
- Touch drag supported on mobile via long-press
- No keyboard reordering — mouse/touch only

### Claude's Discretion
- Exact spacing, typography, and visual styling
- Animation timing for drag feedback
- Error state handling
- Accessibility attributes beyond the decisions above

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches that match existing TeachCoachConnect styling.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-modal-foundation-task-list*
*Context gathered: 2026-01-31*
