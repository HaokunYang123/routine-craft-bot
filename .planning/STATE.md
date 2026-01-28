# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Users can reliably complete their daily workflows with instant feedback and smooth performance.
**Current focus:** v3.0 Auth & Realtime

## Current Position

Phase: 15 - Authentication Rebuild
Plan: 01 of 6
Status: In progress
Last activity: 2026-01-28 — Completed 15-01-PLAN.md (Database Trigger & OAuth Role)

Progress: [█                   ] 5% (1/20 plans estimated)

## Milestone History

| Version | Name | Phases | Shipped |
|---------|------|--------|---------|
| v1 | Reliability Hardening | 1-8 (23 plans) | 2026-01-25 |
| v2.0 | Performance | 9-14 (17 plans) | 2026-01-28 |

See: .planning/MILESTONES.md for full details

## v3.0 Auth & Realtime (In Progress)

**Phases:**
- Phase 15: Authentication Rebuild (13 requirements) — In Progress (1/6 plans)
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
| 15-01 | Profile created with role=NULL | Supports AUTH-10 immutability - role can be SET once but never CHANGED |
| 15-01 | Role passed via redirectTo URL parameter | Survives OAuth redirect, more reliable than localStorage |

See PROJECT.md Key Decisions table for full list with outcomes.

### Pending Todos

None.

### Blockers/Concerns

- Migration needs to be applied to remote Supabase (local/remote migration mismatch)

## Session Continuity

Last session: 2026-01-28T11:52:18Z
Stopped at: Completed 15-01-PLAN.md
Resume file: None

Next action: Execute 15-02-PLAN.md (OAuth Callback)

---
*State initialized: 2026-01-24*
*Last updated: 2026-01-28 — Completed 15-01-PLAN.md*
