# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Users can reliably complete their daily workflows with instant feedback and smooth performance.
**Current focus:** v3.0 Auth & Realtime

## Current Position

Phase: 16 - Realtime Subscriptions
Plan: 5/5 complete (gaps closed)
Status: Phase complete
Last activity: 2026-01-28 — Completed 16-05 gap closure plan

Progress: [████████████░░░░░░░░] 50% (2/3 phases in v3.0)

## Milestone History

| Version | Name | Phases | Shipped |
|---------|------|--------|---------|
| v1 | Reliability Hardening | 1-8 (23 plans) | 2026-01-25 |
| v2.0 | Performance | 9-14 (17 plans) | 2026-01-28 |

See: .planning/MILESTONES.md for full details

## v3.0 Auth & Realtime (In Progress)

**Phases:**
- Phase 15: Authentication Rebuild (6 plans) — Complete
- Phase 16: Realtime Subscriptions (5 plans) — Complete
- Phase 17: Timezone & Rollover — Pending

**Key deliverables (Phase 15 complete):**
- [x] Role selection landing page ("I am a Coach" / "I am a Student")
- [x] Google OAuth only (email/password and login-via-code removed)
- [x] Database trigger for atomic profile creation
- [x] Role-based routing from database (not localStorage)

**Key deliverables (Phase 16 complete):**
- [x] Realtime infrastructure hooks (16-01)
- [x] Coach dashboard realtime (16-02)
- [x] Student app realtime (16-03)
- [x] Verification checkpoint (16-04)
- [x] Gap closure: coach_id column and filter parameters (16-05)

**Phase 16 Gaps (CLOSED):**
- GAP-01: Fixed by adding filter parameter with denormalized coach_id column
- GAP-02: Fixed by updating RLS policy to use direct column comparison

**Remaining deliverables:**
- UTC storage with local timezone display
- Daily rollover at user's local midnight

**Previous milestone:** v2.0 Performance shipped 2026-01-28

## Accumulated Context

### Decisions

| Plan | Decision | Rationale |
|------|----------|-----------|
| 15-01 | Profile created with role=NULL | Supports AUTH-10 immutability - role can be SET once but never CHANGED |
| 15-01 | Role passed via redirectTo URL parameter | Survives OAuth redirect, more reliable than localStorage |
| 15-03 | Card click triggers OAuth directly | Per CONTEXT.md - streamlined UX with no intermediate screens |
| 15-04 | Logout always navigates to / even on error | Ensures user escapes bad state |
| 15-04 | NotFound uses role-based routing for dashboard | Coach goes to /dashboard, student goes to /app |
| 15-05 | useProfile retry with exponential backoff | Handles timing edge case where trigger hasn't completed |
| 15-06 | Branding changed to "TeachCoachConnect" | User feedback during verification checkpoint |
| 16-01 | Channel names scoped by userId | Ensures isolation between users' realtime subscriptions |
| 16-01 | Use invalidateQueries not setQueryData | Simpler cache management, React Query refetches fresh data |
| 16-02 | Same channel name in Dashboard and Calendar | Supabase deduplicates channels with same name - both components share subscription |
| 16-02 | Invalidate queryKeys.assignments.all | Covers all assignment-related queries (lists, progress, instances) |
| 16-03 | Manual subscription for student views | Student pages use direct Supabase queries, not React Query, so manual supabase.channel calling fetchTasks() is appropriate |
| 16-03 | currentMonth in StudentCalendar deps | Ensures channel resubscribes when user navigates to different months |
| 16-04 | Database config applied directly | task_instances added to supabase_realtime, REPLICA IDENTITY FULL set |
| 16-05 | Denormalized coach_id for filter efficiency | Realtime filter requires direct column, not subquery-based RLS |
| 16-05 | Auto-populate via trigger | Ensures consistency without application code changes |

See PROJECT.md Key Decisions table for full list with outcomes.

### Pending Todos

None.

### Blockers/Concerns

- Pre-existing test failure in useProfile.test.tsx (role assertion) — needs fixing
- Runtime verification recommended: test realtime in browser with coach + student

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 16-05-PLAN.md (gap closure)
Resume file: None

Next action: `/gsd:plan-phase 17` for Timezone & Rollover phase

---
*State initialized: 2026-01-24*
*Last updated: 2026-01-28 — Phase 16 complete*
