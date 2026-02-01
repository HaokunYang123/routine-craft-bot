# Roadmap: TeachCoachConnect v5.0

## Milestones

- [x] **v1.0 Reliability Hardening** - Phases 1-8 (shipped 2026-01-25)
- [x] **v2.0 Performance** - Phases 9-14 (shipped 2026-01-28)
- [x] **v3.0 Auth & Realtime** - Phases 15-17 (shipped 2026-01-30)
- [x] **v4.0 Bug Fixes & Polish** - Phases 18-23 (shipped 2026-01-31)
- [ ] **v5.0 Task Assignment UX** - Phases 24-26 (in progress)

## Overview

v5.0 improves the existing AssignerDashboard task assignment experience. Adds clear assign date vs due date separation, visible time blocks, monthly recurring option, and enhanced template scheduling. All changes target the existing Tasks tab UI and supporting backend.

## Phases

- [ ] **Phase 24: Custom Task Scheduling** - Add assign/due date separation, time blocks, monthly recurring to AssignerDashboard
- [ ] **Phase 25: Template Scheduling** - Per-task due times, time blocks in templates, template builder updates
- [ ] **Phase 26: Group Assignment Sync** - Ensure group assignment has same features as custom task flow

## Phase Details

### Phase 24: Custom Task Scheduling
**Goal**: Coaches can create custom tasks with separate assign/due dates, visible time blocks, and monthly recurring
**Depends on**: Nothing (first phase of v5.0)
**Requirements**: DATE-01, DATE-02, DATE-03, DATE-04, TIME-01, TIME-02, TIME-03, TIME-04, RECUR-01, RECUR-02, RECUR-03, RECUR-04, RECUR-05, DB-01, DB-02, DB-03, DB-05
**Success Criteria** (what must be TRUE):
  1. AssignerDashboard shows separate "Assign Date" and "Due Date" fields
  2. Time block displays as "12:00 PM - 1:00 PM" format with both start and end
  3. Schedule dropdown includes Monthly option alongside Daily/Weekly
  4. Database stores end_time and assign_date correctly
  5. Student schedule view shows time blocks properly
**Plans**: 3 plans
Plans:
- [ ] 24-01-PLAN.md - Database schema: add start_time, end_time, assign_date columns + RPC update
- [ ] 24-02-PLAN.md - AssignerDashboard UI: separate assign/due dates, monthly option
- [ ] 24-03-PLAN.md - StudentSchedule: verify time block display, end-to-end verification

### Phase 25: Template Scheduling
**Goal**: Templates support assign date, per-task due times, and time blocks
**Depends on**: Phase 24
**Requirements**: TIME-05, TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, DB-04
**Success Criteria** (what must be TRUE):
  1. Template builder shows due time per task
  2. Template assignment has one assign date for all tasks
  3. Each template task due date calculated from assign date + offset
  4. Template tasks support time blocks
  5. Assigned template tasks display correctly on student schedule
**Plans**: TBD

### Phase 26: Group Assignment Sync
**Goal**: Group assignment ("green button") has same scheduling features as custom tasks
**Depends on**: Phase 24, Phase 25
**Requirements**: GRP-01, GRP-02, GRP-03, GRP-04
**Success Criteria** (what must be TRUE):
  1. Group "Assign Task" button uses updated scheduling UI
  2. Group tasks support assign date + due date
  3. Group tasks support time blocks
  4. Group tasks support monthly recurring
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 24 -> 25 -> 26

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 24. Custom Task Scheduling | 0/3 | Planned | - |
| 25. Template Scheduling | 0/TBD | Not started | - |
| 26. Group Assignment Sync | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-31*
*Last updated: 2026-01-31 - Phase 24 planned with 3 plans*
