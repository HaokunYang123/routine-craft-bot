# Roadmap: TeachCoachConnect v5.0

## Milestones

- [x] **v1.0 Reliability Hardening** - Phases 1-8 (shipped 2026-01-25)
- [x] **v2.0 Performance** - Phases 9-14 (shipped 2026-01-28)
- [x] **v3.0 Auth & Realtime** - Phases 15-17 (shipped 2026-01-30)
- [x] **v4.0 Bug Fixes & Polish** - Phases 18-23 (shipped 2026-01-31)
- [ ] **v5.0 Task Assignment UX** - Phases 24-27 (in progress)

## Overview

v5.0 redesigns the task assignment modal with a global defaults model, progressive disclosure for advanced options, and cleaner information hierarchy. The milestone delivers in four phases: modal foundation with task list, defaults section for scheduling, progressive disclosure accordion for per-task overrides, and template integration with footer polish.

## Phases

**Phase Numbering:**
- Integer phases (24, 25, 26, 27): Planned v5.0 work
- Decimal phases (24.1, 24.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 24: Modal Foundation + Task List** - Core modal shell and compact task list with inline editing
- [ ] **Phase 25: Defaults Section** - Global defaults for due date and recurrence scheduling
- [ ] **Phase 26: Progressive Disclosure** - Per-task accordion with overrides and AI enhancement
- [ ] **Phase 27: Templates + Footer** - Template insertion and summary footer with validation

## Phase Details

### Phase 24: Modal Foundation + Task List
**Goal**: Coaches can create multiple tasks in a clean modal with compact inline editing
**Depends on**: Nothing (first phase of v5.0)
**Requirements**: MODL-01, MODL-02, MODL-03, MODL-04, TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, TASK-06
**Success Criteria** (what must be TRUE):
  1. Modal opens with student/group name in header and explanatory subtext visible
  2. Coach can type task titles inline in compact rows without clicking extra buttons
  3. Coach can add multiple tasks using "Add Task" button, with empty state showing ready-to-type input
  4. Coach can reorder tasks via drag-and-drop
  5. Coach can delete tasks via X button on each row
**Plans**: 2 plans

Plans:
- [ ] 24-01-PLAN.md — Modal shell, task hook, and task row with inline editing
- [ ] 24-02-PLAN.md — Drag-and-drop reordering with dnd-kit and modal integration

### Phase 25: Defaults Section
**Goal**: Coaches can set global due date and recurrence that apply to all tasks
**Depends on**: Phase 24
**Requirements**: DFLT-01, DFLT-02, DFLT-03, DFLT-04, DFLT-05, DFLT-06
**Success Criteria** (what must be TRUE):
  1. Defaults section appears as visually distinct card below task list
  2. Coach can set a required due date that applies to all tasks
  3. Coach can choose between "One-time" (default) and "Repeats" scheduling
  4. When "Repeats" is selected, coach can configure Daily, Weekly, or Custom days
  5. Weekly recurrence shows Mon-Sun day picker; Custom days allows multi-select
**Plans**: TBD

Plans:
- [ ] 25-01: TBD

### Phase 26: Progressive Disclosure
**Goal**: Coaches can expand any task row to access advanced options (description, overrides, AI)
**Depends on**: Phase 24, Phase 25
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08
**Success Criteria** (what must be TRUE):
  1. Clicking a task row's expand icon reveals accordion with additional fields below that row
  2. Only one accordion can be open at a time (expanding another collapses the previous)
  3. Coach can add optional multiline description to any task via accordion
  4. Coach can toggle "Override due date" and set a task-specific due date
  5. Coach can toggle "Override schedule" and set task-specific recurrence options
**Plans**: TBD

Plans:
- [ ] 26-01: TBD
- [ ] 26-02: TBD

### Phase 27: Templates + Footer
**Goal**: Coaches can insert template tasks and see assignment summary before submitting
**Depends on**: Phase 24
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, FOOT-01, FOOT-02, FOOT-03
**Success Criteria** (what must be TRUE):
  1. "Use Template" button appears as secondary action next to "Add Task"
  2. Clicking "Use Template" opens picker and inserting a template adds its tasks to the list
  3. Inserted template tasks can be edited, reordered, or deleted like manually added tasks
  4. Footer is sticky at modal bottom, showing "X task(s) will be assigned" with due date info
  5. Assign button shows count ("Assign (X)") and is disabled until at least one task has title and due date is set
**Plans**: TBD

Plans:
- [ ] 27-01: TBD
- [ ] 27-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 24 -> 25 -> 26 -> 27

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 24. Modal Foundation + Task List | 0/2 | Planned | - |
| 25. Defaults Section | 0/TBD | Not started | - |
| 26. Progressive Disclosure | 0/TBD | Not started | - |
| 27. Templates + Footer | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-31*
*Last updated: 2026-01-31*
