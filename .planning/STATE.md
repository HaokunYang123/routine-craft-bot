# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-31)

**Core value:** Coaches can assign tasks with clear scheduling (assign date vs due date), visible time blocks, and proper recurring options.
**Current focus:** v5.0 Task Assignment UX - Phase 24 executing

## Current Position

Phase: 24 of 26 (Custom Task Scheduling)
Plan: 2 of 3 in current phase (24-02 complete)
Status: In progress
Last activity: 2026-02-01 - Completed 24-02-PLAN.md (UI for assign/due dates and monthly)

Progress: [██████░░░░░░░░░░░░░░] 67% (2/3 plans in Phase 24)

## Milestone History

| Version | Name | Phases | Shipped |
|---------|------|--------|---------|
| v1 | Reliability Hardening | 1-8 (23 plans) | 2026-01-25 |
| v2.0 | Performance | 9-14 (17 plans) | 2026-01-28 |
| v3.0 | Auth & Realtime | 15-17 (14 plans) | 2026-01-30 |
| v4.0 | Bug Fixes & Polish | 18-23 (12 plans) | 2026-01-31 |

See: .planning/MILESTONES.md for full details

## Accumulated Context

### Decisions

See: .planning/PROJECT.md Key Decisions table

**v5.0 Decisions (revised):**
- Work in existing AssignerDashboard, not new modal
- Separate Assign Date (when student sees task) from Due Date (when due)
- Time blocks must show start AND end time (add end_time to DB)
- Add Monthly recurring option
- Templates need per-task due time, one assign date

**Plan 24-01 Decisions:**
- Added start_time column alongside scheduled_time for explicit time block start
- RPC function uses p_assign_date/p_due_date naming for clarity
- Backfilled assign_date from scheduled_date for backward compatibility

**Plan 24-02 Decisions:**
- Renamed startDate/endDate to assignDate/dueDate in hook interface for semantic clarity
- Auto-adjust due date when assign date is moved later than current due date
- Monthly recurrence handles months with fewer days gracefully (uses last available day)

### Pending Todos

None.

### Blockers/Concerns

- Pre-existing test failure in useProfile.test.tsx (role assertion) - tech debt from v3.0
- Pre-existing test failures in useGroups.test.tsx (deleteGroup cache invalidation)
- Custom domain DNS pending (teachcoachconnect.com needs GoDaddy A record)

## Session Continuity

Last session: 2026-02-01
Stopped at: Completed 24-02-PLAN.md
Resume file: .planning/phases/24-custom-task-scheduling/24-03-PLAN.md

Next action: Execute 24-03-PLAN.md (template scheduling enhancements)

---
*State initialized: 2026-01-24*
*Last updated: 2026-02-01 - Completed Plan 24-02 (UI for assign/due dates and monthly)*
