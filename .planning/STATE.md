# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Users can reliably complete their daily workflows with instant feedback and smooth performance.
**Current focus:** v3.0 Auth & Realtime

## Current Position

Phase: 15 - Authentication Rebuild
Plan: 02 of 6
Status: In progress
Last activity: 2026-01-28 — Completed 15-02-PLAN.md (OAuth Callback)

Progress: [                    ] 0% (0/3 phases)

## Milestone History

| Version | Name | Phases | Shipped |
|---------|------|--------|---------|
| v1 | Reliability Hardening | 1-8 (23 plans) | 2026-01-25 |
| v2.0 | Performance | 9-14 (17 plans) | 2026-01-28 |

See: .planning/MILESTONES.md for full details

## v3.0 Auth & Realtime (In Progress)

**Phases:**
- Phase 15: Authentication Rebuild (13 requirements) — In Progress (2/6 plans)
- Phase 16: Realtime Subscriptions (6 requirements) — Pending
- Phase 17: Timezone & Rollover (7 requirements) — Pending

**Total requirements:** 26

**Key deliverables:**
- Role selection landing page ("I am a Coach" / "I am a Student")
- Google OAuth only (email/password and login-via-code removed)
- Database trigger for atomic profile creation
- Role-based routing from database (not localStorage)
- Supabase Realtime subscriptions with React Query integration
- UTC storage with local timezone display
- Daily rollover at user's local midnight

**Previous milestone:** v2.0 Performance shipped 2026-01-28

## Accumulated Context

### Decisions

| Plan | Decision | Rationale |
|------|----------|-----------|
| 15-02 | Role update uses .is('role', null) filter | Supports AUTH-10 immutability - role can be SET once but never CHANGED |
| 15-02 | 500ms retry on profile fetch | Handles trigger timing edge case |
| 15-02 | AuthCallback handles own errors | No RouteErrorBoundary wrapper needed |

See PROJECT.md Key Decisions table for full list with outcomes.

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-28T11:50:38Z
Stopped at: Completed 15-02-PLAN.md
Resume file: None

Next action: Execute 15-03-PLAN.md (Landing Page)

---
*State initialized: 2026-01-24*
*Last updated: 2026-01-28 — Completed 15-02-PLAN.md*
