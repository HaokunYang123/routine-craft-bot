# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-31)

**Core value:** Coaches can assign tasks with clear scheduling (assign date vs due date), visible time blocks, and proper recurring options.
**Current focus:** v5.0 Task Assignment UX - Phase 25 executing

## Current Position

Phase: 25 of 26 (Template Scheduling)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-01 - Completed 25-01-PLAN.md (template scheduling schema and mutations)

Progress: [██████░░░░░░░░░░░░░░] 33% (1/3 plans in Phase 25)

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

**Plan 24-03 Decisions:**
- Added assign_date to StudentSchedule query for future visibility filtering
- Time blocks only display when both start_time and end_time are set

**Plan 25-01 Decisions:**
- Used INTEGER for due_time_offset_minutes (0-1439 range, minutes from midnight)
- Used TEXT for start_time/end_time for 12-hour format consistency with Phase 24
- Added index on template_id for query optimization

### Pending Todos

None.

### Blockers/Concerns

- Pre-existing test failure in useProfile.test.tsx (role assertion) - tech debt from v3.0
- Pre-existing test failures in useGroups.test.tsx (deleteGroup cache invalidation)
- Custom domain DNS pending (teachcoachconnect.com needs GoDaddy A record)

## Session Continuity

Last session: 2026-02-01
Stopped at: Completed 25-01-PLAN.md
Resume file: None

Next action: Execute Phase 25-02 (Template Editor UI)

---
*State initialized: 2026-01-24*
*Last updated: 2026-02-01 - Completed 25-01-PLAN.md (Template Scheduling schema)*
