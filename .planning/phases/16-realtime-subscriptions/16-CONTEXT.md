# Phase 16: Realtime Subscriptions - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Data changes sync instantly between coach and student views via Supabase Realtime. Selective events (task completions, new assignments, check-ins) sync live. Coach sees student updates; students don't see each other. Updates flow through React Query cache.

</domain>

<decisions>
## Implementation Decisions

### Sync scope
- Selective events only — task completions, new assignments, and check-ins sync live
- Coach sees student updates only — students don't see each other's progress
- New assignments appear for students immediately (realtime)
- Check-in submissions sync to coach in realtime

### Update behavior
- Instant replace — UI updates silently (no animations or highlights)
- New assignments appear in list silently (no toast)
- Content updates in place if student is viewing task detail
- No sound or haptic feedback — visual changes only
- No badge/count indicators for check-ins
- Batch updates apply all at once (no flicker)
- Calendar view updates in realtime when tasks are completed
- Paginated lists: only current page gets live updates

### Conflict handling
- Last write wins — simple conflict resolution
- Optimistic UI for task completion — checkbox fills immediately
- Silent rollback + toast on optimistic failure — UI reverts, toast explains

### Connection feedback
- No visible connection indicator — realtime works invisibly
- Auto-reconnect silently on disconnect — no user notification
- No polling fallback — just keep trying to reconnect
- Cleanup subscriptions immediately on navigation — prevent memory leaks

### Claude's Discretion
- WebSocket reconnection strategy details
- Supabase channel organization
- React Query integration patterns
- Debounce/throttle implementation for batch updates

</decisions>

<specifics>
## Specific Ideas

- Success criteria from roadmap: "Realtime updates appear in React Query DevTools as cache invalidations (not bypassing cache)"
- Keep it invisible — users shouldn't notice realtime is happening, it should just feel like the app is always up to date

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-realtime-subscriptions*
*Context gathered: 2026-01-28*
