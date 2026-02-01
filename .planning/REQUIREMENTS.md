# Requirements: TeachCoachConnect v5.0

**Defined:** 2026-01-31
**Core Value:** Coaches can quickly create task assignments without confusion about dates, scheduling, or where to click.

## v5.0 Requirements

Requirements for the Task Assignment UX milestone. Redesigns the assignment modal with global defaults, progressive disclosure, and cleaner information hierarchy.

### Modal Structure

- [ ] **MODL-01**: Modal header shows assignment target (student/group name) with subtext "Create 1+ tasks. Defaults apply to all tasks unless overridden."
- [ ] **MODL-02**: Modal has three-section layout: Tasks section, Defaults section, Details accordion
- [ ] **MODL-03**: Modal has single primary button ("Assign") with secondary "Cancel"
- [ ] **MODL-04**: Primary "Assign" button is disabled until at least one task has a title and due date is set

### Task List

- [ ] **TASK-01**: Task list displays compact rows with inline title input
- [ ] **TASK-02**: Each task row shows: Title (required), Estimated time (optional), Expand icon
- [ ] **TASK-03**: "Add Task" is the single primary action in the Tasks section
- [ ] **TASK-04**: Empty state shows single input row ready for typing (no empty list message)
- [ ] **TASK-05**: Tasks can be reordered via drag-and-drop
- [ ] **TASK-06**: Tasks can be deleted via row action (X button or swipe)

### Defaults Section

- [ ] **DFLT-01**: Defaults section is visually distinct card below task list
- [ ] **DFLT-02**: Due Date picker is required and applies to all tasks by default
- [ ] **DFLT-03**: Schedule dropdown shows "One-time" (default) and "Repeats"
- [ ] **DFLT-04**: When "Repeats" selected, recurrence options appear: Daily / Weekly / Custom days
- [ ] **DFLT-05**: Weekly recurrence shows day picker (Mon-Sun)
- [ ] **DFLT-06**: Custom days shows multi-select for days of week

### Progressive Disclosure

- [ ] **DISC-01**: Clicking task row expands accordion below the row with details
- [ ] **DISC-02**: Accordion shows Description field (optional, multiline)
- [ ] **DISC-03**: Accordion shows "Override due date" toggle (off by default)
- [ ] **DISC-04**: When override enabled, shows date picker for this task's due date
- [ ] **DISC-05**: Accordion shows "Override schedule" toggle (off by default)
- [ ] **DISC-06**: When schedule override enabled, shows recurrence options for this task
- [ ] **DISC-07**: Accordion shows "Enhance with AI" as secondary action
- [ ] **DISC-08**: Only one accordion can be expanded at a time

### Template Integration

- [ ] **TMPL-01**: "Use Template" is secondary button next to "Add Task"
- [ ] **TMPL-02**: Clicking "Use Template" opens template picker (modal or dropdown)
- [ ] **TMPL-03**: Selecting template inserts its tasks into the existing task list
- [ ] **TMPL-04**: Inserted template tasks can be edited/removed like manually added tasks

### Footer

- [ ] **FOOT-01**: Footer shows summary: "X task(s) will be assigned" with due date and schedule
- [ ] **FOOT-02**: Footer is sticky at bottom of modal
- [ ] **FOOT-03**: Assign button shows count: "Assign (X)"

## Out of Scope

| Feature | Reason |
|---------|--------|
| Attachments/links per task | Defer to future milestone, focus on core UX |
| Recurrence end conditions | Keep simple: Daily/Weekly/Custom days without "end after N" |
| Side panel for details | Using accordion (inline) for simpler implementation |
| Drag from templates | Templates insert, not drag-drop |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MODL-01 | TBD | Pending |
| MODL-02 | TBD | Pending |
| MODL-03 | TBD | Pending |
| MODL-04 | TBD | Pending |
| TASK-01 | TBD | Pending |
| TASK-02 | TBD | Pending |
| TASK-03 | TBD | Pending |
| TASK-04 | TBD | Pending |
| TASK-05 | TBD | Pending |
| TASK-06 | TBD | Pending |
| DFLT-01 | TBD | Pending |
| DFLT-02 | TBD | Pending |
| DFLT-03 | TBD | Pending |
| DFLT-04 | TBD | Pending |
| DFLT-05 | TBD | Pending |
| DFLT-06 | TBD | Pending |
| DISC-01 | TBD | Pending |
| DISC-02 | TBD | Pending |
| DISC-03 | TBD | Pending |
| DISC-04 | TBD | Pending |
| DISC-05 | TBD | Pending |
| DISC-06 | TBD | Pending |
| DISC-07 | TBD | Pending |
| DISC-08 | TBD | Pending |
| TMPL-01 | TBD | Pending |
| TMPL-02 | TBD | Pending |
| TMPL-03 | TBD | Pending |
| TMPL-04 | TBD | Pending |
| FOOT-01 | TBD | Pending |
| FOOT-02 | TBD | Pending |
| FOOT-03 | TBD | Pending |

**Coverage:**
- v5.0 requirements: 31 total
- Mapped to phases: 0
- Unmapped: 31

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after initial definition*
