# Requirements: TeachCoachConnect v5.0

**Defined:** 2026-01-31 (revised)
**Core Value:** Coaches can assign tasks with clear scheduling (assign date vs due date), visible time blocks, and proper recurring options.

## v5.0 Requirements

Improve the existing AssignerDashboard task assignment experience. Fix time blocks, add assign/due date separation, and enhance template scheduling.

### Date & Scheduling (Custom Tasks)

- [ ] **DATE-01**: Assign Date field - when students see the task (required)
- [ ] **DATE-02**: Due Date field - when task is due (required, must be >= assign date)
- [ ] **DATE-03**: Clear labels distinguishing "Assign Date" from "Due Date"
- [ ] **DATE-04**: Both dates visible in the task creation UI

### Time Blocks

- [ ] **TIME-01**: Time block UI shows start time AND end time (e.g., "12:00 PM - 1:00 PM")
- [ ] **TIME-02**: Time block is optional but visible when set
- [ ] **TIME-03**: End time stored in database (add `end_time` column to task_instances)
- [ ] **TIME-04**: Time blocks display correctly on student schedule view
- [ ] **TIME-05**: Time blocks work for both custom tasks and templates

### Recurring Tasks

- [ ] **RECUR-01**: Recurring options: One-time, Daily, Weekly, Monthly
- [ ] **RECUR-02**: Monthly option added to schedule type dropdown
- [ ] **RECUR-03**: Weekly shows day picker (Mon-Sun)
- [ ] **RECUR-04**: Monthly shows day-of-month picker (1-31 or "last day")
- [ ] **RECUR-05**: Recurring tasks respect both assign date and due date pattern

### Template Scheduling

- [ ] **TMPL-01**: Template has one Assign Date (when all tasks become visible)
- [ ] **TMPL-02**: Each task in template has its own Due Time/Date offset
- [ ] **TMPL-03**: Template tasks support time blocks
- [ ] **TMPL-04**: Template builder UI shows due time per task
- [ ] **TMPL-05**: Template assignment shows assign date + calculates due dates

### Group Assignment (Green Button)

- [ ] **GRP-01**: "Assign Task" button on Groups/Classes uses same improved UI
- [ ] **GRP-02**: Group assignment supports assign date + due date
- [ ] **GRP-03**: Group assignment supports time blocks
- [ ] **GRP-04**: Group assignment supports all recurring options

### Backend Support

- [ ] **DB-01**: Add `end_time` column to task_instances table
- [ ] **DB-02**: Add `assign_date` column to task_instances (separate from scheduled_date)
- [ ] **DB-03**: Update RPC functions to handle new date/time fields
- [ ] **DB-04**: Template_tasks table supports due time offset
- [ ] **DB-05**: Recurring schedules support monthly option

## Out of Scope

| Feature | Reason |
|---------|--------|
| New modal on GroupDetail page | Use existing AssignerDashboard flow |
| Drag-and-drop task reordering | Not requested, focus on scheduling |
| AI task enhancement | Defer to future milestone |
| Attachments/links | Defer to future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATE-01 | 24 | Pending |
| DATE-02 | 24 | Pending |
| DATE-03 | 24 | Pending |
| DATE-04 | 24 | Pending |
| TIME-01 | 24 | Pending |
| TIME-02 | 24 | Pending |
| TIME-03 | 24 | Pending |
| TIME-04 | 24 | Pending |
| TIME-05 | 25 | Pending |
| RECUR-01 | 24 | Pending |
| RECUR-02 | 24 | Pending |
| RECUR-03 | 24 | Pending |
| RECUR-04 | 24 | Pending |
| RECUR-05 | 24 | Pending |
| TMPL-01 | 25 | Pending |
| TMPL-02 | 25 | Pending |
| TMPL-03 | 25 | Pending |
| TMPL-04 | 25 | Pending |
| TMPL-05 | 25 | Pending |
| GRP-01 | 26 | Pending |
| GRP-02 | 26 | Pending |
| GRP-03 | 26 | Pending |
| GRP-04 | 26 | Pending |
| DB-01 | 24 | Pending |
| DB-02 | 24 | Pending |
| DB-03 | 24 | Pending |
| DB-04 | 25 | Pending |
| DB-05 | 24 | Pending |

**Coverage:**
- v5.0 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 - Revised based on user feedback (AssignerDashboard focus)*
